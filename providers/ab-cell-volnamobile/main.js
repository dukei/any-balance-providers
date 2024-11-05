/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Origin': 'https://lk-new.volnamobile.ru',
    'Platform': 'web',
    'Referer': 'https://lk-new.volnamobile.ru/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
}

var baseurl = 'https://srv.volnamobile.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.token);
//	AnyBalance.setData('refreshToken', json.refresh_token);
//  AnyBalance.setData('expiresIn', json.expires_in);
//	AnyBalance.setData('tokenType', json.token_type);
	AnyBalance.saveData();
}

function callApi(verb, params){
	var accessToken = AnyBalance.getData('accessToken');
	var deviceId = AnyBalance.getData('deviceId');
	
	var method = 'GET', headers = g_headers;
	if(params){
		method = 'POST';
		headers['Content-Type'] = 'application/json';
	}else{
		headers['Authorization'] = 'Bearer ' + accessToken;
	}
	
	headers['X-Device-Id'] = deviceId;
	
	AnyBalance.trace('Запрос: ' + baseurl + verb);
	var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(params), headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.message || json.error){
		var error = json.message || json.error;
		if(/wrong_credentials/i.test(error))
			throw new AnyBalance.Error('Неверный номер или пароль', null, true);
		if(error)
			throw new AnyBalance.Error(error, null, /credential|номер|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginPure(verb, params){
	var prefs = AnyBalance.getPreferences(), json;
	
    var deviceId = AnyBalance.getData('deviceId');
	if(!deviceId){
		var deviceId = generateUUID();
	    AnyBalance.setData('deviceId', deviceId);
		AnyBalance.saveData();
    }
	
	var json = callApi('api/clients/check?phone=' + prefs.login);
	
	if(json.is_exists !== true){
    	throw new AnyBalance.Error('Пользователь не существует или заблокирован', null, true);
    }
	
    var json = callApi('api/clients/auth', {phone: prefs.login, password: prefs.password});

    if(!json || !json.token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }

	var accessToken = json.token;
	AnyBalance.trace('Токен авторизации получен');
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('api/clients');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		saveTokens({});
		return false;
	}
}
/*
function loginRefreshToken(){
	var prefs = AnyBalance.getPreferences();
	var refreshToken = AnyBalance.getData('refreshToken');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var json = callApi('connect/token', {grant_type: 'refresh_token', username: prefs.login, refresh_token: refreshToken, client_id: 'mobile-app.client'});
		AnyBalance.trace('Успешно вошли по refreshToken');
		saveTokens(json);
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
		saveTokens({});
		return false;
	}
}
*/
function loginToken(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('accessToken')){
		AnyBalance.trace('Токен не сохранен. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('accessToken') && (AnyBalance.getData('login') !== prefs.login)){
		AnyBalance.trace('Токен соответствует другому логину');
		return false;
	}

	if(loginAccessToken())
		return true;
	
//	return loginRefreshToken();
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
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона (10 цифр без пробелов и разделителей)!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var cc = {};

	login();

	var result = {success: true};
	
	var json;
	
	json = callApi('api/clients/balance');
	
	getParam(json.volume, result, 'balance', null, null, parseBalance);
	getParam(json.bonus, result, 'bonuses', null, null, parseBalance);
	
	json = callApi('api/clients/tariffs');
	
	getParam(json.name, result, '__tariff');
	
	if(AnyBalance.isAvailable('abon')){
		var dt = new Date();
		
	    if(json.prices && json.prices.length > 0){
			for(var i=0; i<json.prices.length; ++i){
                var p = json.prices[i];
			    if(p.periodic_unit !== 'month'){
                    var sp = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate(); // Дней в этом месяце
                }else{
                    var sp = 1;
                }
		        sumParam(p.periodic*sp, result, 'abon', null, null, parseBalanceSilent, aggregate_sum);
			}
		}else{
			AnyBalance.trace('Не удалось получить информацию по абонентской плате');
		}
	}
	
	json = callApi('api/clients/services/balance');
    
	if (json && json.length > 0){
		getCounters(json);
	}else{
		AnyBalance.trace('Не удалось получить информацию по остаткам');
	}
                                                                        	
    function getCounters(val){
        AnyBalance.trace('Все остатки: '+ JSON.stringify(val));
        for(var i=0; i<val.length; ++i){
        	var rem = val[i];
        	if(rem.type == 'minutes' || /Минуты|Звонки/i.test(rem.description)){ // Минуты
        		setCounter(rem, 'min')
        	}else if(rem.type == 'sms' || /SMS|СМС/i.test(rem.description)){ // SMS
        		setCounter(rem, 'sms')
        	}else if(rem.type == 'gigabyte' || rem.type == 'megabyte' || /Интернет/i.test(rem.description)){ // Гигабайты
        		setCounter(rem, 'traffic')
        	}else{
        		AnyBalance.trace('Неизвестный тип данных: ' + JSON.stringify(rem));
			}
        }
    }

    function setCounter(rem, counter){
       	if(!cc[counter]){
    		cc[counter] = 1;
    	}else{
	    	cc[counter] += 1;
		}
   	    if(rem.type == 'gigabyte'){
   	    	getParam((rem.volume).toFixed(1) + ' Gb', result, counter + '_left' + cc[counter], null, null, parseTraffic);
   	    }else if(rem.type == 'megabyte'){
   	    	getParam((rem.volume).toFixed(1) + 'Mb', result, counter + '_left' + cc[counter], null, null, parseTraffic);
		}else{
			getParam((rem.volume).toFixed(1), result, counter + '_left' + cc[counter], null, null, parseBalance);
		}
   	    if(prefs.needPref || !AnyBalance.isAvailable(counter + '_left' + cc[counter])){
   	    	result[counter + '_left_name' + cc[counter]] = (rem.name + ': ');
		}
    		
        var dat = getParam(rem.expire_date.replace(/(\d*)-(\d*)-(\d*)(T?[\s\S]*)/, '$3.$2.$1'), null, null, null, null, parseDate);
        if(dat && (!result.dateOfExpire || dat > result.dateOfExpire)){
			getParam(dat, result, 'dateOfExpire');
		}
    }
	
	if(AnyBalance.isAvailable('total_spent', 'last_oper_sum', 'last_oper_date', 'last_oper_desc')){
		var dt = new Date();
		
		json = callApi('api/clients/statistics/spending?from=' + n2(dt.getMonth() + 1) + '.' + dt.getFullYear());
		
		if(json.services && json.services.length > 0){
			for(var i=0; i<json.services.length; ++i){
                var s = json.services[i];
				getParam(s.spent, result, 'last_oper_sum', null, null, parseBalance);
				getParam(s.date.replace(/(\d*)-(\d*)-(\d*)(T?[\s\S]*)/, '$3.$2.$1'), result, 'last_oper_date', null, null, parseDate);
				getParam(s.name, result, 'last_oper_desc');
				
			    break;
			}
		}else{
	    	AnyBalance.trace('Не удалось получить информацию по финансам');
	    }
		
		getParam(json.total_spent, result, 'total_spent', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable('ls', 'phone', 'fio')){
	    json = callApi('api/clients');
	    
	    getParam(json.personal_account, result, 'ls');
	    getParam(json.phone, result, 'phone', null, replaceNumber);
	    getParam(json.first_name + ' ' + json.last_name, result, 'fio', null, null, capitalFirstLetters);
	}

    AnyBalance.setResult(result);
}
