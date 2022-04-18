/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'Keep-Alive',
	'Cache-Control': 'no-cache',
	'User-Agent': 'ozonapp_android/12.2.2+1395',
	'x-o3-app-name': 'ozonapp_android',
	'x-o3-app-version': '12.2.2(1395)',
	'x-o3-device-type': 'mobile'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

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
    	
    	var code = AnyBalance.retrieveCode(otp.title + '. ' + otp.subtitle, null, {inputType: 'number', time: 300000});
    	json = callApi('composer-api.bx/_action/' + otp.action, joinObjects(joinObjects(getDeviceInfo(),otp.data),{otp: code}));
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
	
	if (isAvailable(['balance', 'bonus', 'bonus_premium', 'bonus_salers', 'fio'])) {
		html = AnyBalance.requestGet('https://user-account.ozon.ru/safe-api/public/v1/user-account/balance', g_headers);
		var json = getJson(html);
	    if(!json || !json.balance){
			AnyBalance.trace('Не удалось получить баланс');
			result.balance = null;
	    }else{
			getParam((json.balance)/100, result, 'balance', null, null, parseBalance);
		}
		
	    html = AnyBalance.requestGet('https://www.ozon.ru/my/points/?tab=classic', g_headers);
	
	    var tsHeadLs = getElements(html, /<span[^>]+class="tsHeadL"[^>]*>/ig);
		var i8ls = getElements(html, /<div><!----> <!----> <span[^>]+class="i8l"[^>]*>/ig);
        if(tsHeadLs){
   	    	for(var i=0; i<tsHeadLs.length; ++i){
		        var tsHeadL = tsHeadLs[i];
				var i8l = i8ls[i];
		        if(/Баллы Ozon/i.test(i8l))
		        	getParam(tsHeadL, result, 'bonus', /<span[^>]+class="tsHeadL"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			    if(/Premium баллы/i.test(i8l))
		        	getParam(tsHeadL, result, 'bonus_premium', /<span[^>]+class="tsHeadL"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			    if(/Бонусы продавцов/i.test(i8l))
		        	getParam(tsHeadL, result, 'bonus_salers', /<span[^>]+class="tsHeadL"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			}
        }else{
        	AnyBalance.trace('Не удалось получить таблицу баллов');
        }
		
		var firstName = getParam(html, null, null, /"firstName":"([^"]*)/i, replaceTagsAndSpaces);
		var lastName = getParam(html, null, null, /"lastName":"([^"]*)/i, replaceTagsAndSpaces);
		result.fio = firstName + ' ' + lastName;
		
		var hist = getElements(html, /<div[^>]+class="i3m"[^>]*>/ig)[0];
        if(hist){
		    getParam(hist, result, 'oper_sum', /<div[^>]+class="i4m tsBodyLBold">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            getParam(hist, result, 'oper_desc', /<span[^>]+class="m3i tsBodyL">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
			var date = getParam(hist, null, null, /<span[^>]+class="im4 tsBodyM">([\s\S]*?)в \d\d\:\d\d\s*<\/span>/i, replaceTagsAndSpaces);
			if (!/\d\d\d\d/i.test(date)) {
				var dt = new Date();
				var ndate = date + ' ' + dt.getFullYear();
			} else {
				var ndate = date;
			}
			getParam(ndate, result, 'oper_date', null, null, parseDateWord);
        }else{
        	AnyBalance.trace('Не удалось получить данные по последней операции');
        }
	}
		
//		json = callApi('my-account-api.bx/account/v1');
//		AnyBalance.trace(JSON.stringify(json));
		
//		getParam(json.clientAccountEntryInformationForWeb.current, result, 'balance');
//		getParam(json.clientAccountEntryInformationForWeb.blocked, result, 'blocked');
//		getParam(json.clientAccountEntryInformationForWeb.accessible, result, 'available');
//		getParam(json.clientAccountEntryInformationForWeb.score, result, 'bonus');
	
	
	var orders = 0;
	if (isAvailable(['order_sum', 'weight', 'ticket', 'state'])) {
		json = callApi('composer-api.bx/page/json/v1?url=%2Fmy%2Forderlist');
		AnyBalance.trace(JSON.stringify(json));

		var ola = getDefaultProp(json.csma.orderListApp);
		for(var i=0; ola.orderListApp && i<ola.orderListApp.length; ++i){
			var order = ola.orderListApp[i];
			AnyBalance.trace('Нашли ' + order.header.title + ' ' + order.header.number);
			json = callPageJson(order.deeplink);
		    
            getParam(getDefaultProp(json.csma.orderTotal).summary.footer.price.price, result, 'order_sum', null, null, parseBalance);
			getParam(order.sections[0].status.name, result, 'state');
			getParam(order.header.number, result, 'ticket');
		    
//			if(AnyBalance.isAvailable('weight')){
//				var shw_items = getDefaultProp(json.csma.shipmentWidget).items;
//				var it = shw_items.find(function(b){ return b.type=="postings" });
//				for(var k=0; k<it.postings.postings.length; ++k){
//					var p = it.postings.postings[k];
//					var pjson = callPageJson(p.action.link);
//
//					var textAtom = getDefaultProp(pjson.common.textBlock).body.find(function(b){ return b.type=="textAtom" });
//					if(textAtom)
//						sumParam(textAtom.textAtom.text, result, 'weight', /•.*/, null, parseWeight, aggregate_sum);
//				}
//			}

			break;
		}

	}

	result.__tariff = prefs.login;
	getParam(prefs.login, result, 'phone', null, replaceNumber);
	
	AnyBalance.setResult(result);
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

