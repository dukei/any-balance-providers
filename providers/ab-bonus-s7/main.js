/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	accept: 'application/json',
	authorization: 'Basic YW5kcm9pZDpUUFh3aFg0RnRYZUxTZXRkVjhURWE4NnBXOEE5aFZGdA==',
	'x-language': 'en',
	'x-platform': 'android',
	'x-application-version': '4.3.4',
	'x-device': '',
	Connection: 'Keep-Alive',
	'Accept-Encoding': 'gzip',
	'User-Agent': 'okhttp/4.9.0',
	ADRUM_1: 'isMobile:true',
	ADRUM: 'isAjax:true'
};

function callApi(verb, params){
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({'Content-Type': 'application/json; charset=UTF-8'});
	}
	
	var html = AnyBalance.requestPost('https://ps3.api.s7.ru/' + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	if(json.error){
		var error = json.error.message || json.error;
		if(error)
			throw new AnyBalance.Error(error,null, /crede/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
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
	
	var type = 'CARD';
	if(/@/.test(prefs.login))
		type = 'EMAIL';
	else if(/^\+\d+$/.test(prefs.login))
		type = 'PHONE';

	var json = callApi('auth/api/profiles/tickets', {
        "device": getDeviceId(),
        "id": prefs.login,
        "secret": prefs.password,
//        "temporaryResource": "a52cdf6b-aba9-4a94-8e6b-8b01f4081f64",
        "type": type
    });

  	g_headers['x-token'] = json.ticket.token;

    AnyBalance.setData('login', prefs.login);
    AnyBalance.setData('token', json.ticket.token);
    AnyBalance.setData('resid', json.ticket.resourceId);
    AnyBalance.saveData();
}

function setAuthHeader(at){
	if(at)
		g_headers.Authorization = (at.token_type || at.tokenType) + ' ' + (at.access_token || at.accessToken);
	else
		delete g_headers.Authorization;
}

function loginAccessToken(){
	var token = AnyBalance.getData('token');
	try{
	    g_headers['x-token'] = token;
		callApi('profiles/api/profiles/' + AnyBalance.getData('resid'));
		AnyBalance.trace('Удалось войти по token');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по token: ' + e.message);
	    delete g_headers['x-token'];
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();

	if(!AnyBalance.getData('token') || !AnyBalance.getData('resid')){
		AnyBalance.trace("Токен не сохранен");
		return false;
	}

	if(prefs.login != AnyBalance.getData('login')){
		AnyBalance.trace("Токен соответствует другому логину");
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

    g_headers['x-device'] = getDeviceId();

    login();

    var resid = AnyBalance.getData('resid');

    var jsonLoyalty = callApi('loyalty/api/loyalties/' + resid);

    var cardLevels = {
        CLASSIC: 'Классическая',
        SILVER: 'Серебряная',
        GOLD: 'Золотая',
        PLATINUM: 'Платиновая'
    };

    var result = {
        success: true
    };

    for(var i=0; i<jsonLoyalty.profile.balancesContainer.length; ++i){
    	var b = jsonLoyalty.profile.balancesContainer[i];
    	if(b.type === 'REDEMPTION')
    		AB.getParam(b.value, result, 'balance');
    	if(b.type === 'QUALIFYING')
    		AB.getParam(b.value, result, 'qmiles');
    	if(b.type === 'FLIGHTS')
    		AB.getParam(b.value, result, 'flights');
    }
                      
    AB.getParam(jsonLoyalty.profile.memberId, result, 'cardnum');

    AB.getParam(jsonLoyalty.profile.names[0].firstName + ' ' + jsonLoyalty.profile.names[0].lastName, result, 'userName');
    AB.getParam(cardLevels[jsonLoyalty.profile.eliteTier.level] || jsonLoyalty.profile.eliteTier.level, result, 'type');
    AB.getParam(cardLevels[jsonLoyalty.profile.eliteTier.level] || jsonLoyalty.profile.eliteTier.level, result, '__tariff');
                        
    AnyBalance.setResult(result);
}
