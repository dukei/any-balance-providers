/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'Keep-Alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];
var replaceCard = [replaceTagsAndSpaces, /\D/g, '', /(.*)(\d\d\d)(\d\d\d)$/, '$1 $2 $3'];

function callApi(verb, params){
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
	}
	
    headers = addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Adrum': 'isAjax:true',
		'Content-Type': 'application/json',
		'Referer': 'https://myprofile.s7.ru/',
		'X-Application-Version': '2.1.6',
		'X-Language': 'ru',
		'X-User-Agent': 'LoginWidget;Chrome;116.0.0.0;Windows'
	});
	
	if(/\/loyalties\//i.test(verb)){
		headers['Referer'] = 'https://myprofile.s7.ru/miles';
	}
	
	AnyBalance.trace('Запрос: ' + verb);
	var html = AnyBalance.requestPost('https://myprofile.s7.ru/' + verb, params_str, headers, {HTTP_METHOD: method});
	AnyBalance.trace('Ответ: ' + html);
	var json = getJson(html);
	if(json.error){
		var error = json.error.message || json.error;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function getDeviceId(){
	var prefs = AnyBalance.getPreferences();
	var id = hex_md5(prefs.login);
	return id;
}

function loginPure(){
	var prefs = AnyBalance.getPreferences(), json;
	
	var deviceId = AnyBalance.getData('deviceId');
	if(!deviceId){
		deviceId = getDeviceId();
		AnyBalance.setData('deviceId', deviceId);
		AnyBalance.saveData();
	}
	
	var html = AnyBalance.requestGet('https://www.s7.ru/ru/s7-priority/personal-account/', g_headers);
	
	var json = callApi('auth/auth/api/profiles/tickets', {
		"id": prefs.login,
        "secret": prefs.password,
        "temporaryResource": generateUUID(),
        "device": deviceId
    });
	
	token = json.ticket && json.ticket.token;
	
    if(!token){
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}

    AnyBalance.setData('login', prefs.login);
    AnyBalance.setData('token', json.ticket.token);
    AnyBalance.setData('resid', json.ticket.resourceId);
    AnyBalance.saveData();
	setCoockies();
}

function setCoockies(){
	var token = AnyBalance.getData('token');
	var resid = AnyBalance.getData('resid');
	
    AnyBalance.setCookie('.s7.ru', 'ssdcp', token);
	AnyBalance.setCookie('.s7.ru', 'userId', resid);
	AnyBalance.setCookie('.s7.ru', 'ga_pid', resid);
	AnyBalance.setCookie('.s7.ru', 'profileId', resid);
	AnyBalance.setCookie('s7.ru', 'isAuth', '1');
}

function loginAccessToken(){
	AnyBalance.trace('Сессия сохранена. Пробуем войти...');
	setCoockies();
	try{
		callApi('api/service/profiles/api/profiles/' + AnyBalance.getData('resid'));
		AnyBalance.trace('Успешно вошли в предыдущей сессии');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти в предыдущей сессии: ' + e.message);
		AnyBalance.clearData();
        AnyBalance.saveData();
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();

	if(!AnyBalance.getData('token') || !AnyBalance.getData('resid')){
		AnyBalance.trace("Сессия не сохранена. Будем логиниться заново...");
		return false;
	}

	if(prefs.login != AnyBalance.getData('login')){
		AnyBalance.trace("Сохраненная сессия соответствует другому логину");
		return false;
	}

	return loginAccessToken();
}

function login(){
	if(!loginToken()){
		loginPure();
	}
}

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet('https://www.s7.ru/ru/s7-priority/personal-account/', g_headers);

    login();
	
	var result = {success: true};

    var resid = AnyBalance.getData('resid');

    var json = callApi('api/service/loyalty/api/loyalties/' + resid);

    var cardLevels = {
        'CLASSIC': 'Классическая',
		'CLASSIC_JUNIOR': 'Классическая',
		'CLASSIC_MASTER': 'Классическая',
		'CLASSIC_EXPERT': 'Классическая',
		'CLASSIC_TOP': 'Классическая',
        'SILVER': 'Серебряная',
        'GOLD': 'Золотая',
        'PLATINUM': 'Платиновая'
    };
	
	var levels = {
        'CLASSIC': 'Classic',
		'CLASSIC_JUNIOR': 'Classic Junior',
		'CLASSIC_MASTER': 'Classic Master',
		'CLASSIC_EXPERT': 'Classic Expert',
		'CLASSIC_TOP': 'Classic Top',
        'SILVER': 'Silver',
        'GOLD': 'Gold',
        'PLATINUM': 'Platinum'
    };
	
	var state = {
        'ACTIVE': 'Активен',
		'SUSPENDED': 'Приостановлен',
		'BLOCKED': 'Заблокирован'
    };

    for(var i=0; i<json.profile.balancesContainer.length; ++i){
    	var b = json.profile.balancesContainer[i];
    	if(b.type === 'REDEMPTION')
    		AB.getParam(b.value, result, 'balance', null, null, parseBalance);
    	if(b.type === 'QUALIFYING')
    		AB.getParam(b.value, result, 'qmiles', null, null, parseBalance);
    	if(b.type === 'FLIGHTS')
    		AB.getParam(b.value, result, 'flights', null, null, parseBalance);
    }
	
    var cardNum = AB.getParam(json.profile.memberId, result, 'cardnum', null, replaceCard);
	AB.getParam(json.profile.eliteTier.expirationDate, result, 'expDate', null, null, parseDateISO);
	
	if(AnyBalance.isAvailable('phone', 'email')){
	    for(var i=0; i<json.profile.contacts.length; ++i){
    	    var b = json.profile.contacts[i];
    	    if(b.type === 'PHONE')
			    AB.getParam(b.value, result, 'phone', null, replaceNumber);
    	    if(b.type === 'EMAIL')
    		    AB.getParam(b.value, result, 'email');
        }
	}
	
	if(AnyBalance.isAvailable('userName', 'cardUserName')){
	    for(var i=0; i<json.profile.names.length; ++i){
    	    var b = json.profile.names[i];
    	    if(b.lang === 'ru')
		        AB.getParam(b.firstName + ' ' + b.lastName, result, 'userName');
    	    if(b.lang === 'en')
    		    AB.getParam(b.firstName + ' ' + b.lastName, result, 'cardUserName');
        }
	}
	
	if(AnyBalance.isAvailable('burning', 'burnDate')){
		result.unitsname = 'm';
	    for(var i=0; i<json.profile.burningPoints.length; ++i){
    	    var b = json.profile.burningPoints[i];
		    AB.getParam(b.pointsAmount, result, 'burning', null, null, parseBalance);
		    AB.getParam(b.expirationDate, result, 'burnDate', null, null, parseDateISO);
	        if(b.type === 'QUALIFYING'){
			    result.unitsname = 'qm';
    	    }else if(b.type === 'FLIGHTS'){
    		    result.unitsname = 'qf';
	        }else if(b.type === 'REDEMPTION'){
    		    result.unitsname = 'm';
	        }
			
			break;
        }
	}

    AB.getParam(cardLevels[json.profile.eliteTier.level] || json.profile.eliteTier.level, result, 'type');
	AB.getParam(levels[json.profile.eliteTier.level]||json.profile.eliteTier.level, result, 'status');
	AB.getParam(cardNum + ' | ' + levels[json.profile.eliteTier.level]||json.profile.eliteTier.level, result, '__tariff');
    if(json.profile.eliteTier.nextLevelRequirements){
	    AB.getParam(levels[json.profile.eliteTier.nextLevelRequirements.nextLevel]||json.profile.eliteTier.nextLevelRequirements.nextLevel, result, 'nextStatus');
	    AB.getParam(json.profile.eliteTier.nextLevelRequirements.flights, result, 'flightsToNextStatus', null, null, parseBalance);
	    AB.getParam(json.profile.eliteTier.nextLevelRequirements.miles, result, 'milesToNextStatus', null, null, parseBalance);
	}
	AB.getParam(state[json.profile.provider.status]||json.profile.provider.status, result, 'accStatus');
	
	if(AnyBalance.isAvailable(['lastOperDate', 'lastOperSum', 'lastOperDesc'])){
	    var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear()-1, dt.getMonth(), dt.getDate());
	    var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate());
	    var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
		var json = callApi('api/service/loyalty/api/loyalties/' + resid + '/transactions?from=' + dateFrom + '&to=' + dateTo + '&includeDiagram=true');
		if(json.transactions && json.transactions.length > 0){
			AnyBalance.trace('Найдено операций: ' + json.transactions.length);
			for(var i=0; i<json.transactions.length; ++i){
				var t = json.transactions[i];
				
				getParam(t.date, result, 'lastOperDate', null, null, parseDateISO);
				getParam(t.totalValue, result, 'lastOperSum', null, null, parseBalance);
				var res = '<b>' + t.partnerName + ': ' + t.typeDescription + '</b>';
				res += '<br> ' + t.description;
				res += ',<br> Статусные мили: ' + t.qualifying + ' qm';
				res += ',<br> Статусные полеты: ' + t.flights + ' qf';
				getParam(res, result, 'lastOperDesc');
				
				break;
			}
		}else{
			AnyBalance.trace('Не удалось получить историю операций');
		}
	}
                        
    AnyBalance.setResult(result);
}
