/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Authorization': 'Bearer',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'okhttp/3.12.0'
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.access_token);
//	AnyBalance.setData('refreshToken', json.refresh_token);
    AnyBalance.setData('expiresIn', json.expires_in);
	AnyBalance.setData('tokenType', json.token_type);
	AnyBalance.saveData();
}

function callApi(verb, params){
	var accessToken = AnyBalance.getData('accessToken');
	var method = 'GET', headers = g_headers;
	if(params){
		method = 'POST';
		if (!accessToken){
			headers = addHeaders({'Authorization': 'Bearer', 'Content-Type': 'application/x-www-form-urlencoded'});
		}else{
		    headers = addHeaders({'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/x-www-form-urlencoded'});
		}
	}else{
		if (/preauth/i.test(verb)){
			headers = addHeaders({'Authorization': 'Bearer'});
		}else{
		    headers = addHeaders({'Authorization': 'Bearer ' + accessToken});
		}
	}
	
	AnyBalance.trace('Запрос: ' + verb.replace(/([password|pass]*=)([\s\S]*?)(?:&|$)/i, '$1**********'));
	var html = AnyBalance.requestPost('https://mobile-api-v2.tut.net/api/v6/' + verb, params, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.error){
		var error = json.message || json.error;
		if(error && error === 'Unauthorised')
			throw new AnyBalance.Error('Неверный логин или пароль!');
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginPure(action, params, method){
	var prefs = AnyBalance.getPreferences(), json;
	
	var login = prefs.login.replace(/\D/g, '');
	
	if (/^\d{10}$/.test(login)){
	    var json = callApi('preauth?username=7' + login + '&pass=' + prefs.password);
	}else{
		var json = callApi('preauth?username=' + login + '&pass=' + prefs.password);
	}

    if(!json || !json.ac){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить идентификатор пользователя. Сайт изменен?');
    }

	var userId = json.ac[0].id;
	AnyBalance.trace('Идентификатор получен: ' + userId);
	
    var json = callApi('auth', {username: userId, password: prefs.password, grant_type: 'password'}, 'POST');

    if(!json || !json.access_token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }

	var accessToken = json.access_token;
	AnyBalance.trace('Токен получен: ' + accessToken);
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.setData('pass', prefs.password);
	AnyBalance.setData('userId', userId);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	var accessToken = AnyBalance.getData('accessToken');
	var userId = AnyBalance.getData('userId');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('auth', {username: userId, password: prefs.password, grant_type: 'password'}, 'POST');
		AnyBalance.trace('Успешно вошли по accessToken');
		saveTokens(json);
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

//function loginRefreshToken(){
//	var prefs = AnyBalance.getPreferences();
//	var refreshToken = AnyBalance.getData('refreshToken');
//	try{
//		AnyBalance.trace('Токен устарел. Пробуем обновить...');
//		var json = callApi('connect/token', {grant_type: 'refresh_token', username: prefs.login, refresh_token: refreshToken, client_id: 'mobile-app.client'}, 'POST');
//		AnyBalance.trace('Успешно вошли по refreshToken');
//		saveTokens(json);
//		return true;
//	}catch(e){
//		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
//		saveTokens({});
//		return false;
//	}
//}

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
	
	if(AnyBalance.getData('accessToken') && (AnyBalance.getData('pass') !== prefs.password)){
		AnyBalance.trace('Токен соответствует другому паролю');
		return false;
	}

	if(loginAccessToken()){
		return true;
	}else{
		AnyBalance.trace('Токен устарел. Будем логиниться заново');
		return loginPure();
	}
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

	login();

	var result = {success: true};
	
	var json = callApi('data/clientinfo?password=' + prefs.password);
	
	var state = {
		false: 'Активный',
		true: 'Приостановлен'
	};
	
	if (json.data.balance) {
		getParam(parseFloat(json.data.balance.toFixed(2)), result, 'balance', null, null, parseBalance);
	}
	getParam(json.data.paymentInMonth, result, 'abon', null, null, parseBalance);
	getParam(json.data.tarif, result, '__tariff');
	getParam(state[json.data.freeze]||json.data.freeze, result, 'status');
	getParam(json.data.ac_id, result, 'agreement');
	getParam(json.data.address, result, 'address');
	getParam(json.data.contact_phone.replace(/(.*)(\d{3})(\d{3})(\d\d)(\d\d)$/, '+7 $2 $3-$4-$5'), result, 'phone');
	getParam(json.data.fio, result, 'fio');
	if(json.data.blocked)
		result.status = 'Заблокирован';
	
	var date = getParam(json.data.datePayment, null, null, null, null, parseDate);
	
	if (date) {
		var dt = new Date(date).getTime();
		var hours = new Date().getHours();
		
		if(hours >= 0 && hours < 6){
			date = AnyBalance.getData('dateToOff') ? AnyBalance.getData('dateToOff') : date;
			dt = new Date(date).getTime();
		}else{
			AnyBalance.setData('dateToOff', date);
			AnyBalance.saveData();
		}
		
		result.date_to_off = date;
		var days = Math.ceil((dt - (new Date().getTime())) / 86400 / 1000);
		if (days >= 0) {
			result.days_to_off = days;
		} else {
			AnyBalance.trace('Дата отключения уже наступила');
			result.days_to_off = 0;
		}
	} else {
 		AnyBalance.trace('Не удалось получить дату отключения');
 	}
	
	var services = json.data.services;
	if(services){
		AnyBalance.trace('Найдено подключенных услуг: ' + services.length);
		for(var i = 0; i<services.length; i++){
			var sname = (i >= 1 ? 'servicename' + (i + 1) : 'servicename');
	    	var sdesc = (i >= 1 ? 'servicedesc' + (i + 1) : 'servicedesc');
		   	getParam(services[i].title, result, sname, null, null, capitalizeFirstLetter);
			getParam(services[i].desc, result, sdesc, null, null, capitalizeFirstLetter);
		}
	}else{
 		AnyBalance.trace('Не удалось получить данные по услугам');
 	}

    AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
