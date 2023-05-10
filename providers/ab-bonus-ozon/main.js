/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'Keep-Alive',
	'Cache-Control': 'no-cache',
	'User-Agent': 'ozonapp_android/14.46+2253',
	'x-o3-app-name': 'ozonapp_android',
	'x-o3-app-version': '14.46(2253)',
	'x-o3-device-type': 'mobile'
};

var g_webHeaders = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'ru-RU,ru;q=0.9',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function callApi(verb, params){
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({'Content-Type': 'application/json; charset=UTF-8'});
	}
	
//	AnyBalance.trace('Запрос: ' + verb);
	var html = AnyBalance.requestPost('https://api.ozon.ru/' + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);
//	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.error){
		var error = json.error.message || json.error;
		if(error)
			throw new AnyBalance.Error(error,null, /не найден/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function callPageJson(url, params){
	return callApi('composer-api.bx/page/json/v1?url=' + encodeURIComponent(url.replace(/^ozon:\//, '')), params);
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

function getDeviceInfo(){
	var prefs = AnyBalance.getPreferences();
	return {
    	"vendor": "OnePlus",
    	"hasSmartLock": true,
    	"hasBiometrics": true,
    	"biometryType": "FINGER_PRINT",
    	"model": "OnePlus ONEPLUS A3010",
    	"deviceId": hex_md5(prefs.login).replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5'),
    	"version": "9"
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
    	AnyBalance.trace('Вход по емейл');
    	json = callPageJson('/my/entry/credentials-required?type=emailOtpEntry', getDeviceInfo());
    }else{
    	AnyBalance.trace('Вход по телефону');
    	json = callPageJson('/my/entry/credentials-required', getDeviceInfo());
    }
    
    var submit = getDefaultProp(json.csma.entryCredentialsRequired).submitButton;
    if(!submit)
    	throw new AnyBalance.Error('Не удалось найти кнопку входа. Сайт изменен?');
    if(/@/.test(prefs.login)){
    	json = callApi('composer-api.bx/_action/' + submit.action, joinObjects(getDeviceInfo(),{email: prefs.login}));
    }else{
    	json = callApi('composer-api.bx/_action/' + submit.action, joinObjects(getDeviceInfo(),{phone: prefs.login}));
    }
    while(json.status && json.status.deeplink){
    	AnyBalance.trace('Потребовалась проверка: ' + json.status.deeplink);
    	json = callPageJson(json.status.deeplink);
    	var otp = getDefaultProp(json.csma.otp);
		if(!otp.subtitle)
			throw new AnyBalance.Error(otp.title, null, /превышен/i.test(otp.title));
    	var code = AnyBalance.retrieveCode(otp.title.replace(/\n/g, '') + '. ' + otp.subtitle.replace(/\n/g, ''), null, {inputType: 'number', time: 300000});
    	json = callApi('composer-api.bx/_action/' + otp.action, joinObjects(joinObjects(getDeviceInfo(),otp.data),{otp: code}));
		
		if(json.status && json.status.deeplink && (/isLongTimeNoSee=true/i.test(json.status.deeplink))){
			AnyBalance.trace('Потребовалась проверка по почте: ' + json.status.deeplink);
    	    json = callPageJson(json.status.deeplink);
    	    var otp = getDefaultProp(json.csma.entryCredentialsRequired);
			json = callApi('composer-api.bx/_action/' + otp.submitButton.action);
			AnyBalance.trace('Потребовалась проверка: ' + json.status.deeplink);
    	    json = callPageJson(json.status.deeplink);
    	    var otp = getDefaultProp(json.csma.otp);
    	    var code = AnyBalance.retrieveCode(otp.title + '. ' + otp.subtitle, null, {inputType: 'number', time: 300000});
    	    json = callApi('composer-api.bx/_action/' + otp.action, joinObjects(joinObjects(getDeviceInfo(),otp.data),{extraOtp: code}));
		}
    }

    if(!json.data || !json.data.authToken){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Неожиданный ответ после авторизации. Сайт изменен?');
    }

    saveAuthToken(json.data.authToken);
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

function loginAccessToken(){
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

function loginRefreshToken(){
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
		AnyBalance.trace("Токен не сохранен");
		return false;
	}

	if(prefs.login != AnyBalance.getData('login')){
		AnyBalance.trace("Токен соответствует другому логину");
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

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/@|^\d{10}$/.test(prefs.login), 'Введите e-mail или телефон (10 цифр без пробелов и разделителей)!');

	login();

	var result = {success: true};
	
	var at = AnyBalance.getData('authToken');
	
	if (isAvailable(['balance', 'bonus', 'miles', 'bonus_premium', 'bonus_salers', 'fio'])) {
		html = AnyBalance.requestGet('https://user-account.ozon.ru/action/safeUserAccountBalance', g_headers);
		var json = getJson(html);
//		AnyBalance.trace('Баланс Ozon' + JSON.stringify(json));
		getParam((json.balance)/100, result, 'balance', null, null, parseBalance);
		
        html = AnyBalance.requestGet('https://api.ozon.ru/composer-api.bx/page/json/v1?url=%2Fmy%2Fpoints', g_webHeaders);
		var json = getJson(html);

		var ozonPoints = getDefaultProp(json.premium.premiumBalanceHeader);
//		AnyBalance.trace('Баллы Ozon: ' + JSON.stringify(ozonPoints));
		if(ozonPoints){
		    getParam(ozonPoints.ozon && ozonPoints.ozon.amount, result, 'bonus', null, null, parseBalance);
		    getParam(ozonPoints.miles && ozonPoints.miles.amount, result, 'miles', null, null, parseBalance);
		}
		
		var salersPoints = getDefaultProp(json.premium.premiumSellerPointsBalance);
//		AnyBalance.trace('Бонусы продавцов: ' + JSON.stringify(salersPoints));
		if(salersPoints)
		    getParam(salersPoints.totalBalance, result, 'bonus_salers', null, null, parseBalance);
		
		if(isAvailable(['oper_sum', 'oper_desc', 'oper_date'])){
		    var opa = getDefaultProp(json.premium.paymentsHistory);
//			AnyBalance.trace('Операции с баллами: ' + JSON.stringify(opa));
		    if (opa && opa.history) {
				var opa = opa.history[0];
		        for(var i=0; opa.items && i<opa.items.length; ++i){
		        	var oper = opa.items[i];
		        	AnyBalance.trace('Нашли операцию "' + oper.title + '" ');
		    
                    getParam(oper.amount, result, 'oper_sum', null, null, parseBalance);
                    getParam(oper.title, result, 'oper_desc');
			        getParam(opa.date, result, 'oper_date', null, null, parseSmallDateSilent);
				
			        break;
		        }
            }else{
		    	AnyBalance.trace('Не удалось получить данные по последней операции');
		    }
		}
		
		var acc = getDefaultProp(json.myProfile.userAvatar);
//		AnyBalance.trace('Профиль: ' + JSON.stringify(json));
		
		getParam(acc.firstName + ' ' + acc.secondName, result, 'fio');
	}
	
	if (isAvailable(['ozoncard_balance', 'favourites'])) {
		json = callApi('composer-api.bx/page/json/v2?url=%2Fmy', getDeviceInfo());
//		AnyBalance.trace('Аккаунт: ' + JSON.stringify(json));
		
		var widgetStates = json.widgetStates;
		if (widgetStates) {
			var data = JSON.stringify(widgetStates);
			getParam(data, result, 'ozoncard_balance', /subTitleTextAtom\\":{\\"text\\":\\"([\s\S]*?)\\"/i, replaceTagsAndSpaces, parseBalance);
			getParam(data, result, 'favourites', /Избранное\\",\\"subtitle\\":\\"([\s\S]*?)\\"/i, replaceTagsAndSpaces, parseBalance);
        }else{
			AnyBalance.trace('Не удалось получить данные по балансу Ozon Карты');
		}
	}
	
	if (isAvailable(['order_sum', 'weight', 'ticket', 'state'])) {
		json = callApi('composer-api.bx/page/json/v1?url=%2Fmy%2Forderlist');
//		AnyBalance.trace('Заказы: ' + JSON.stringify(json));

		var ola = getDefaultProp(json.csma.orderListApp);
		if (ola) {
		    for(var i=0; ola.orderListApp && i<ola.orderListApp.length; ++i){
		    	var order = ola.orderListApp[i];
		    	AnyBalance.trace('Нашли ' + order.header.title + ' ' + order.header.number);
		    	json = callPageJson(order.deeplink);
		    
                getParam(getDefaultProp(json.csma.orderTotal).summary.footer.price.price, result, 'order_sum', null, null, parseBalance);
		    	getParam(order.header.title, result, 'order_date', null, null, parseSmallDateSilent);
				getParam(order.sections[0] && order.sections[0].status && order.sections[0].status.name, result, 'state');
		    	getParam(order.header.number, result, 'ticket');
				
			    break;
		    }
        }else{
			AnyBalance.trace('Не удалось получить данные по последнему заказу');
		}
	}
	
	if (isAvailable('notifications')) {
		json = callApi('composer-api.bx/page/json/v1?url=%2Fcommunications%2Fnotifications');
		var not = getDefaultProp(json.csma.activeOrdersCount);
//		AnyBalance.trace('Уведомления: ' + JSON.stringify(not));
		
		getParam(0|not.activeOrders, result, 'active_orders', null, null, parseBalance);
		getParam(0|not.allUnread, result, 'notifications', null, null, parseBalance);
	}

	result.__tariff = prefs.login;
	getParam(prefs.login, result, 'phone', null, replaceNumber);
	
	AnyBalance.setResult(result);
}

function parseSmallDateSilent(str) {
    return parseSmallDate(str, true);
}

function parseSmallDate(str, silent) {
    var dt = parseSmallDateInternal(str);
    if(!silent)
    	AnyBalance.trace('Parsed small date ' + new Date(dt) + ' from ' + str);
    return dt;
}

function parseSmallDateInternal(str) {
	var now = new Date();
	if (/сегодня/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		return date.getTime();
	} else if (/вчера/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1);
		return date.getTime();
	} else {
		if (!/\d{4}/i.test(str)) { //Если год в строке не указан, значит это текущий год
			str = str + ' '  + now.getFullYear();
		}
        var date = getParam(str, null, null, null, null, parseDateWordSilent);
		return date;
	}
}

/** Вычисляет вес в кг из переданной строки. */
function parseWeight(text, defaultUnits) {
    return parseWeightEx(text, 1000, 1, defaultUnits);
}

/** Вычисляет вес в нужных единицах из переданной строки. */
function parseWeightEx(text, thousand, order, defaultUnits) {
    var _text = replaceAll(text, replaceTagsAndSpaces);
    var val = parseBalanceSilent(_text);
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

