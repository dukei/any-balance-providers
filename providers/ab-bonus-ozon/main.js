/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'Keep-Alive',
	'Cache-Control': 'no-cache',
	'User-Agent': 'ozonapp_android/7.7+946',
	'x-o3-app-name': 'ozonapp_android',
	'x-o3-app-version': '7.7(946)',
};

function callApi(verb, params){
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({'Content-Type': 'application/json; charset=UTF-8'});
	}
	
	var html = AnyBalance.requestPost('https://api.ozon.ru/' + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	if(json.error){
		var error = json.error.message || json.error;
		if(error)
			throw new AnyBalance.Error(error,null, /не найден/i.test(error));
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
	var id = AnyBalance.getData('deviceid');
	if(!id){
		id = generateUUID();
		AnyBalance.setData('deviceid', id);
		AnyBalance.saveData();
	}
	return id;
}

function loginPure(){
	var prefs = AnyBalance.getPreferences(), json;
	
    if(/@/.test(prefs.login)){
    	AnyBalance.trace('Вход по емейл');
    	json = callApi('composer-api.bx/_action/emailOtpEntryMobile?email=&origin=&otp=&otpId=&phone=', {
    		deviceId: getDeviceId(),
    		email: prefs.login,
    		hasBiometrics: true
    	});
    }else{
    	AnyBalance.trace('Вход по телефону');
    	json = callApi('composer-api.bx/_action/fastEntryMobile?origin=', {
    		deviceId: getDeviceId(),
    		phone: '7' + prefs.login,
    		hasBiometrics: true
    	});
    }

    var action = getParam(json.status.deeplink, /action=([^&]*)/, null, decodeURIComponent);
    if(!action){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Неверный ответ сервера. Сайт изменен?');
    }

    var phone = getParam(json.status.deeplink, /phone=([^&]*)/, null, decodeURIComponent);

    var code = AnyBalance.retrieveCode('Пожалуйста, введите код, посланный на телефон ' + phone, null, {inputType: 'number', time: 300000});

    json = callApi('composer-api.bx/_action/' + action, {
    	abGroup: '37',
    	deviceId: getDeviceId(),
    	hasBiometrics: true,
    	otp: code
    });

    if(!json.data.authToken){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Неверный ответ сервера при входе. Сайт изменен?');
    }

    var at = json.data.authToken;
    AnyBalance.setData('login', prefs.login);
    AnyBalance.setData('authToken', at);
    AnyBalance.saveData();

	g_headers.Authorization = (at.token_type || at.tokenType) + ' ' + (at.access_token || at.accessToken);
}

function loginAccessToken(){
	var at = AnyBalance.getData('authToken');
	g_headers.Authorization = (at.token_type || at.tokenType) + ' ' + (at.access_token || at.accessToken);
	try{
		callApi('user/v5');
		AnyBalance.trace('Удалось войти по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginToken(){
	if(loginAccessToken())
		return true;
	
	AnyBalance.trace('Получаем новый accessToken');

	var at = AnyBalance.getData('authToken');
	var html = AnyBalance.requestPost('https://api.ozon.ru/OAuth/v1/auth/token', {
		grant_type:	'refresh_token',
		client_id:	'androidapp',
		client_secret:	'MaiNNqA859bnMqw',
		refresh_token: at.refresh_token || at.refreshToken
	}, g_headers);

	if(AnyBalance.getLastStatusCode() != 200){
		AnyBalance.trace('Не удалось обновить рефреш токен: ' + AnyBalance.getLastStatusCode() + ' ' + html);
		return false;
	}

	var json = getJson(html);
	AnyBalance.setData('authToken', json);
	AnyBalance.saveData();

	if(loginAccessToken())
		return true;

	return false;
}

function login(){
	var prefs = AnyBalance.getPreferences();
	if(prefs.login != AnyBalance.getData('login')){
		loginPure();
	}else if(!loginToken()){
		loginPure();
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/@|^\d{10}$/.test(prefs.login), 'Введите e-mail или телефон (10 цифр без пробелов и разделителей)!');

	login();

	var result = {success: true};
	
	if (isAvailable(['balance', 'blocked', 'available', 'bonus'])) {
		json = callApi('my-account-api.bx/account/v1');
		
		getParam(json.clientAccountEntryInformationForWeb.current, result, 'balance');
		getParam(json.clientAccountEntryInformationForWeb.blocked, result, 'blocked');
		getParam(json.clientAccountEntryInformationForWeb.accessible, result, 'available');
		getParam(json.clientAccountEntryInformationForWeb.score, result, 'bonus');
	}
	
	var orders = 0;
	if (isAvailable(['order_sum', 'weight', 'ticket', 'state'])) {
		json = callApi('composer-api.bx/page/json/v1?url=%2Fmy%2Forderlist');

		for(var i in json.csma.orderListApp){
			var ol = json.csma.orderListApp[i].orderList;

			if(ol && ol.length){
				var order = ol[0];
		    
		        for(var j=0; j<order.elements.length; ++j){
		        	var el = order.elements[j];
		        	if(/сумма/i.test(el.text)){
                		getParam(el.text, result, 'order_sum', null, null, parseBalance);
                		break;
		        	}
		        }

				getParam(order.status.name, result, 'state');
				getParam(order.number, result, 'ticket');
		    
				if(AnyBalance.isAvailable('weight')){
					json = callApi('my-account-api.bx/orders/v2/details?number=' + encodeURIComponent(order.number));
					json = json.data[0];
		    
					for(var i=0; i<json && json.shipments.length; ++i){
						sumParam(json.shipments[i].total.weight, result, 'weight', null, null, parseWeight);
					}
				}
			}
		}

	}

	result.__tariff = prefs.login;
	
	AnyBalance.setResult(result);
}

/** Вычисляет вес в кг из переданной строки. */
function parseWeight(text, defaultUnits) {
    return parseWeightEx(text, 1000, 1, defaultUnits);
}

/** Вычисляет вес в нужных единицах из переданной строки. */
function parseWeightEx(text, thousand, order, defaultUnits) {
    var _text = replaceAll(text, replaceSpaces);
    var val = getParam(_text, /(-?\.?\d[\d\.,]*)/, replaceFloat, parseFloat);
    if (!isset(val) || val === '') {
        AnyBalance.trace("Could not parse Weight value from " + text);
        return;
    }
    var units = getParam(_text, /([кk]?[гgтt])/i);
    if (!units && !defaultUnits) {
        AnyBalance.trace("Could not parse Weight units from " + text);
        return;
    }
    if (!units)
        units = defaultUnits;

    function scaleWeight(odr){
    	val = Math.round(val / Math.pow(thousand, order - (odr || 0)) * 100) / 100;
    }

    switch (units.substr(0, 1).toLowerCase()) {
        case 'г':
        case 'g':
            scaleWeight();
            break;
        case 'k':
        case 'к':
            scaleWeight(1);
            break;
        case 't':
        case 'т':
            scaleWeight(2);
            break;
    }
    var textval = '' + val;
    if (textval.length > 6)
        val = Math.round(val);
    else if (textval.length > 5)
        val = Math.round(val * 10) / 10;
    var dbg_units = {
        0: 'г',
        1: 'кг',
        2: 'т',
    };
    AnyBalance.trace('Parsing weight (' + val + dbg_units[order] + ') from: ' + text);
    return val;
}

