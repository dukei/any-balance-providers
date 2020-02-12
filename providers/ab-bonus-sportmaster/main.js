/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
    'Connection': 'keep-alive',
    Origin: 'https://www.sportmaster.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
	'Cache-Control': 'max-age=0',
	'Upgrade-Insecure-Requests': '1',
	'Sec-Fetch-User': '?1',                   	
	'Referer': 'https://www.sportmaster.ru/user/session/login.do?continue=%2F',
};

var g_cardTypes = [
    {},
    { auth: 'COMMON', check: '300', name: 'Обычный' },
    { auth: 'SILVER', check: '301', name: 'Серебряный' },
    { auth: 'GOLD', check: '302', name: 'Золотой' }
];

function generateUUID () {
    var s = [], itoh = '0123456789abcdef', i;
    for (i = 0; i < 36; i++) {
        s[i] = Math.floor(Math.random() * 0x10);
    }
    s[14] = 4;
    s[19] = (s[19] & 0x3) | 0x8;
    for (i = 0; i < 36; i++) {
        s[i] = itoh[s[i]];
    }
    s[8] = s[13] = s[18] = s[23] = '-';
    return s.join('');
}

var g_androidId;
var g_accessToken;

function callApi(action, params, method){
	if(!g_androidId){
		var prefs = AnyBalance.getPreferences();
		g_androidId = hex_md5(prefs.login).substr(0, 16);
	}

    if(!g_accessToken){
    	var token = AnyBalance.getData('accessToken');
    	if(token && AnyBalance.getData('login') === prefs.login)
    		g_accessToken = token;
    }

    if(!g_accessToken){
    	g_accessToken = generateUUID();
    	AnyBalance.setData('login', prefs.login);
    	AnyBalance.setData('accessToken', g_accessToken);
    	AnyBalance.saveData();
    }

	var headers = {
		'User-Agent': 'mobileapp-android-3.5.5(21135)',
		'X-SM-MobileApp': g_androidId,
		Connection: 'Keep-Alive'
	};

	if(params)
		headers['Content-Type'] = 'application/json; charset=utf-8';

	var delim = action.indexOf('?') >= 0 ? '&' : '?';
	action += delim + 'access-token=' + encodeURIComponent(g_accessToken);

	var html = AnyBalance.requestPost('https://mobileapp.sportmaster.ru/rest/v1/' + action, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method || 'GET'});

	var json = getJson(html);
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error, /42/i.test(json.error) ? true : null, /телефон|парол/i.test(json.error));
	}
		
	return json;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите номер телефона!');
    AB.checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');

    var json = getInfo();

    if(!json.auth || json.auth.anonymous){
    	json = callApi('confirmation/sms/signIn', {phone: prefs.login}, 'POST');

    	var code = AnyBalance.retrieveCode('Пожалуйста, введите SMS для подтверждения входа в личный кабинет Спортмастер', null, {inputType: 'number', time: json.waitSeconds*1000});

    	json = callApi('auth', {password: code, token: prefs.login, type: 'signInCode'}, 'POST');
    	
    	json = getInfo();
    }

    if(addBonuses())
    	json = getInfo();

    var result = {success: true};

    AB.getParam(json.bonus.clientInfo.curLevelName, result, '__tariff');
    AB.getParam(json.bonus.clientInfo.cardNumber, result, 'cardnum');

    var balance = 0, minExpDate, minExpSum;
    if(json.bonus.clientInfo.bonuses){
    	balance = json.bonus.clientInfo.bonuses.reduce(function(acc, a){
    		var dt = parseDateISO(a.dateEnd);
    		if(!isset(minExpDate) || minExpDate > dt){
    			minExpDate = dt;
    			minExpSum = a.amount;
    		}
    		return acc+=a.amount;
    	}, 0)
    }

    AB.getParam(balance, result, 'balance');
    AB.getParam(json.bonus.clientInfo.toNextLevelSumma, result, 'nextlevel');
    getParam(minExpDate, result, 'till');
    getParam(minExpSum, result, 'sumtill');


    AnyBalance.setResult(result);
}

function getInfo(){
    var json = callApi('entities?' + createUrlEncodedParams({
    	types: 'auth,bonus,profile',
    	'access-token': g_accessToken
    }));
    return json;
}


function addBonuses(){
    try{
    	AnyBalance.trace('Получаем бонусы постоянного клиента...');
    	var headers = {
			'X-User-Time-Zone': 'Europe/Moscow',
			'Api-Authorization': g_accessToken,
			Connection: 'Keep-Alive',
			'User-Agent': 'okhttp/3.12.2'
	    };

    	var html = AnyBalance.requestGet('https://api.sportmaster.kingbird.ru/tasks/all', headers);
	    json = getJson(html).filter(function(a){return a.type==='RC'});
	    if(json.length === 0){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось найти бонус "Постоянный клиент"');
	    }
	   
	    if(json[0].status === 'Y'){
	    	throw new AnyBalance.Error('Бонус уже активирован сегодня');
	    }

	    html = AnyBalance.requestGet('https://api.sportmaster.kingbird.ru/points/' + json[0].id, headers);
	    if(AnyBalance.getLastStatusCode() >= 400){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось начислить бонусы');
	    }

	    json = getJson(html);
	    AnyBalance.trace(html);
	    AnyBalance.trace('Бонусы успешно начислены');
	    return true;
    }catch(e){
    	AnyBalance.trace('проблема с халявными бонусами: ' + e.message);
    	return false;
    }
}
