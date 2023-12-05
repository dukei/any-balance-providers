/**
Процедура входа в Ozon Id. Унифицирована и выделена в отдельный файл для удобства встраивания
*/

function callApi(verb, params){
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({'Content-Type': 'application/json; charset=UTF-8'});
	}
	
	AnyBalance.trace('Запрос: ' + 'https://api.ozon.ru/' + verb);
	var html = AnyBalance.requestPost('https://api.ozon.ru/' + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.error){
		var error = json.error.message || json.error;
		if(error)
			throw new AnyBalance.Error(error, null, /код|не найден/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function callPageJson(url, params){
	return callApi('composer-api.bx/_action/' + url.replace(/^ozon:\/\//, ''), params);
}

function getDeviceInfo(){
	var prefs = AnyBalance.getPreferences();
	return {
    	"hasSmartLock": true,
    	"hasBiometrics": true,
    	"deviceId": hex_md5(prefs.login).replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5')
	}
}

function getDefaultProp(obj){
	for(var prop in obj){
		if(/-default-/.test(prop))
			return obj[prop];
		return obj;
	}
}

function loginPure(){
	var prefs = AnyBalance.getPreferences(), json;
	
    if(/@/.test(prefs.login)){
    	AnyBalance.trace('Входим по E-mail...');
		json = callPageJson('ozonIdPageEntry?iso=RU&type=emailOtpEntry&widgetName=csma.entryCredentialsRequired');
    }else{
    	AnyBalance.trace('Входим по телефону...');
        json = callPageJson('ozonIdPageEntry?widgetName=csma.entryCredentialsRequired');
    }
    
	var submit = json.data.submitButton;
    if(!submit)
    	throw new AnyBalance.Error('Не удалось найти кнопку входа. Сайт изменен?');
    if(/@/.test(prefs.login)){
    	json = callApi('composer-api.bx/_action/' + submit.action, joinObjects(getDeviceInfo(),{email: prefs.login}));
    }else{
    	json = callApi('composer-api.bx/_action/' + submit.action, {phone: '7' + prefs.login});
    }
    while(json.status && json.status.deeplink){
    	AnyBalance.trace('Потребовалась проверка: ' + json.status.deeplink);
		
    	json = callPageJson(json.status.deeplink);
    	var otp = json.data;
		if(!otp.subtitle)
			throw new AnyBalance.Error(otp.title, null, /превышен/i.test(otp.title));
    	var code = AnyBalance.retrieveCode(html_entity_decode(otp.title.replace(/\n/g, '')) + '. ' + html_entity_decode(otp.subtitle.replace(/(\s[\\u003c|<].*)/i, '')), null, {inputType: 'number', time: 300000});
    	json = callPageJson(otp.action, joinObjects(joinObjects(getDeviceInfo(),otp.data),{otp: code}));
		
		if(json.status && json.status.deeplink && (/isLongTimeNoSee=true/i.test(json.status.deeplink))){
			AnyBalance.trace('Потребовалась проверка по почте: ' + json.status.deeplink);
    	    json = callPageJson(json.status.deeplink);
//    	    var otp = getDefaultProp(json.csma.entryCredentialsRequired);
			var otp = json.data;
//			json = callApi('composer-api.bx/_action/' + otp.submitButton.action);
			json = callPageJson(otp.submitButton.action);
			AnyBalance.trace('Потребовалась проверка: ' + json.status.deeplink);
    	    json = callPageJson(json.status.deeplink);
//    	    var otp = getDefaultProp(json.csma.otp);
			var otp = json.data;
    	    var code = AnyBalance.retrieveCode(otp.title + '. ' + otp.subtitle, null, {inputType: 'number', time: 300000});
//    	    json = callApi('composer-api.bx/_action/' + otp.action, joinObjects(joinObjects(getDeviceInfo(),otp.data),{extraOtp: code}));
			json = callPageJson(otp.action, joinObjects(joinObjects(getDeviceInfo(),otp.data),{extraOtp: code}));
		}
    }

    if(!json.data || !json.data.authToken){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось войти в Ozon Id. Сайт изменен?');
    }

    saveAuthToken(json.data.authToken);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}

function saveAuthToken(at){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setData('authToken', at);
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	setAuthHeader(at);
}

function setAuthHeader(at){
	if(at)
		g_headers.Authorization = (at.token_type || at.tokenType) + ' ' + (at.access_token || at.accessToken);
	else
		delete g_headers.Authorization;
}

function loginAccessToken(){ // Проверяем авторизацию в Ozon ID
	var at = AnyBalance.getData('authToken');
	try{
	    setAuthHeader(at);
		callApi('composer-api.bx/_action/isUserPremium');
		AnyBalance.trace('Удалось войти по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){// Восстанавливаем авторизацию в Ozon ID
	var at = AnyBalance.getData('authToken');
	try{
	    setAuthHeader();
		at = callApi('composer-api.bx/_action/initAuthRefresh', {refreshToken: at.refreshToken});
		AnyBalance.trace('Удалось войти по refreshToken');
		saveAuthToken(at.authToken);
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();

	if(!AnyBalance.getData('authToken')){
		AnyBalance.trace('Токен не сохранен');
		return false;
	}

	if(prefs.login != AnyBalance.getData('login')){
		AnyBalance.trace('Токен соответствует другому логину');
		return false;
	}

	if(loginAccessToken())
		return true;
	
	return loginRefreshToken();
}

function login(){
	if(!loginToken()){
		loginPure();
	}
}
