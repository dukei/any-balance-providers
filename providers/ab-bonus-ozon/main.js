/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json; charset=UTF-8',
	'Connection': 'Keep-Alive',
	'Cache-Control': 'no-cache',
	'User-Agent': 'ozonapp_android/16.16.0+2366',
	'x-o3-app-name': 'ozonapp_android',
	'x-o3-app-version': '16.16.0(2366)',
	'x-o3-device-type': 'mobile'
};

var g_webHeaders = {
'connection': 'keep-alive',
'accept-language': 'en-US,en;q=0.9',
'upgrade-insecure-requests': '1',
'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
//'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
'sec-ch-ua-mobile': '?0',
'sec-ch-ua-platform': '"Windows"',
//'sec-ch-ua-platform': '"Linux"',
'sec-fetch-site': 'none',
'sec-fetch-mode': 'navigate',
'sec-fetch-user': '?1',
'sec-fetch-dest': 'document',
};
var g_savedData;

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

function callWebApi(verb, params){
	var method = 'GET', params_str = '', headers = g_webHeaders;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({'Content-Type': 'application/json; charset=UTF-8'});
	}
	
	AnyBalance.trace('Запрос: ' + verb);
	if(/safeUserAccountBalance/i.test(verb)){
		var baseurlApi = 'https://user-account.ozon.ru/';
	}else{
		var baseurlApi = 'https://api.ozon.ru/';
	}
	var html = AnyBalance.requestPost(baseurlApi + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
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
	return callApi('composer-api.bx/page/json/v2?url=' + encodeURIComponent(url.replace(/^ozon:\//, '')), params);
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
		if(/-default-/.test(prop)){
			return obj[prop];
		}
		return obj;
	}
}

function getDefaultPropName(obj, str){
	for(var prop in obj){
		if (prop.includes(str)) {
			obj = obj[prop];
			break;
		}
	}
	return obj;
}

function loginPure(){
	var prefs = AnyBalance.getPreferences(), json;

    loadProtectedPage("https://www.ozon.ru/", g_webHeaders);
	
    if(/@/.test(prefs.login)){
    	AnyBalance.trace('Входить будем по email');
    	json = callPageJson('/my/entry/credentials-required?type=emailOtpEntry', getDeviceInfo());
    }else{
    	AnyBalance.trace('Входить будем по телефону');
    	json = callPageJson('/my/entry/credentials-required', getDeviceInfo());
    }
	
	if(json.common && json.common.emptyState){ // Проверка на новую версию
	    var empty = getDefaultProp(json.common.emptyState);
	    if(empty && empty.message){
		    var error = empty.title + '. ' + empty.message;
		    if(error)
			    throw new AnyBalance.Error(error,null, /устарел|обновит/i.test(error));
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	    }
	}
	
	var submit = JSON.parse(getDefaultPropName(json.widgetStates, 'entryCredentialsRequired')).submitButton;
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
		var otp = JSON.parse(getDefaultPropName(json.widgetStates, 'otp'));
		if(!otp.subtitle)
			throw new AnyBalance.Error(otp.title, null, /превышен/i.test(otp.title));
    	var code = AnyBalance.retrieveCode(otp.title.replace(/\n/g, '') + '. ' + otp.subtitle.replace(/\n/g, ''), null, {inputType: 'number', time: 300000});
    	json = callApi('composer-api.bx/_action/' + otp.action, joinObjects(joinObjects(getDeviceInfo(),otp.data),{otp: code}));
		
		if(json.status && json.status.deeplink && (/isLongTimeNoSee=true/i.test(json.status.deeplink))){
			AnyBalance.trace('Потребовалась проверка по почте: ' + json.status.deeplink);
    	    json = callPageJson(json.status.deeplink);
			var otp = JSON.parse(getDefaultPropName(json.widgetStates, 'entryCredentialsRequired'));
			json = callApi('composer-api.bx/_action/' + otp.submitButton.action);
			AnyBalance.trace('Потребовалась проверка: ' + json.status.deeplink);
    	    json = callPageJson(json.status.deeplink);
			var otp = JSON.parse(getDefaultPropName(json.widgetStates, 'otp'));
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
        AnyBalance.setOptions({CLIENT: 'okhttp'});

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/@|^\d{10}$/.test(prefs.login), 'Введите e-mail или телефон (10 цифр без пробелов и разделителей)!');

	login();

	var result = {success: true};
	
	var at = AnyBalance.getData('authToken');
	
	if (isAvailable(['balance', 'bonus', 'bonus_pending', 'miles', 'bonus_premium', 'bonus_salers', 'premium_state', 'email', 'phone', 'fio'])) {
		json = callWebApi('action/safeUserAccountBalance');
//		AnyBalance.trace('Баланс Ozon' + JSON.stringify(json));
		getParam((json.balance)/100, result, 'balance', null, null, parseBalance);
		
        json = callWebApi('composer-api.bx/page/json/v2?url=%2Fmy%2Fpoints');
		
		try {
		    var ozonPoints = JSON.parse(getDefaultPropName(json.widgetStates, 'premiumBalanceHeader'));
		} catch (e) {
            AnyBalance.trace('ozonPoints: ' + e.message);
        }
		
//		AnyBalance.trace('Баллы Ozon: ' + JSON.stringify(ozonPoints));
		if(ozonPoints){
		    if(ozonPoints.ozon)
			    getParam(ozonPoints.ozon.amount, result, 'bonus', null, null, parseBalance);
			if(ozonPoints.pending)
			    getParam(ozonPoints.pending.amount, result, 'bonus_pending', null, null, parseBalance);
		    if(ozonPoints.miles)
			    getParam(ozonPoints.miles.amount, result, 'miles', null, null, parseBalance);
		}
		
		try {
		    var salersPoints = JSON.parse(getDefaultPropName(json.widgetStates, 'premiumSellerPointsBalance'));
//		AnyBalance.trace('Бонусы продавцов: ' + JSON.stringify(salersPoints));
		} catch (e) {
            AnyBalance.trace('salersPoints: ' + e.message);
        }
		
		if(salersPoints){
		    getParam(salersPoints.totalBalance, result, 'bonus_salers', null, null, parseBalance);
		}
		
		if(isAvailable(['oper_sum', 'oper_desc', 'oper_date'])){
			try {
		        var opb = JSON.parse(getDefaultPropName(json.widgetStates, 'paymentsHistory'));
		    } catch (e) {
                AnyBalance.trace('opb: ' + e.message);
            }
			
//			AnyBalance.trace('Операции с баллами: ' + JSON.stringify(opb));
		    if (opb && opb.history && opb.history.length > 0) {
				var opb = opb.history[0];
		        for(var i=0; opb.items && i<opb.items.length; ++i){
		        	var oper = opb.items[i];
		        	AnyBalance.trace('Нашли операцию с баллами "' + oper.title + '" ');
		    
                    getParam(oper.amount, result, 'oper_sum', null, null, parseBalance);
                    getParam(oper.title, result, 'oper_desc');
			        getParam(opb.date, result, 'oper_date', null, null, parseSmallDateSilent);
				
			        break;
		        }
            }else{
		    	AnyBalance.trace('Не удалось получить данные по операциям с баллами');
		    }
		}
		
		var info = json.userInfo;
	    if(info && info.user && info.user.email)
	        getParam(info.user.email, result, 'email');
		
		try {
		    var acc = JSON.parse(getDefaultPropName(json.widgetStates, 'userAvatar'));
//		    AnyBalance.trace('Профиль: ' + JSON.stringify(acc));
		} catch (e) {
            AnyBalance.trace('acc: ' + e.message);
        }
		
		var premStatus = {true: 'Активна', false: 'Не активна'};
	    getParam(premStatus[acc.isPremium]||acc.isPremium, result, 'premium_state');
		var fio = getParam(acc.firstName + ' ' + acc.secondName, result, 'fio');
		if(fio){
			result.__tariff = fio;
		}else{
			result.__tariff = prefs.login;
		}
		getParam(prefs.login, result, 'phone', null, replaceNumber);
	}
	
	if (isAvailable(['rub_oper_sum', 'rub_oper_desc', 'rub_oper_state', 'rub_oper_date'])) {
	    json = callWebApi('composer-api.bx/page/json/v2?url=%2Fmy%2Faccount');
//		AnyBalance.trace('account: ' + JSON.stringify(json));
		
		try {
		    var opr = JSON.parse(getDefaultPropName(json.widgetStates, 'history'));
		} catch (e) {
            AnyBalance.trace('opr: ' + e.message);
        }
        
//		AnyBalance.trace('Операции с балансом: ' + JSON.stringify(items));
		if (opr && opr.items && opr.items.length > 0) {
		    for(var i=0; opr.items && i<opr.items.length; ++i){
		        var oper = opr.items[i];
		        AnyBalance.trace('Нашли операцию с балансом "' + oper.operation + '" ');
		        
                getParam(oper.sum, result, 'rub_oper_sum', null, null, parseBalance);
                getParam(oper.operation, result, 'rub_oper_desc');
				getParam(oper.status, result, 'rub_oper_state');
			    getParam(oper.date, result, 'rub_oper_date', null, null, parseDateISO);
				
			    break;
		    }
        }else{
		    AnyBalance.trace('Не удалось получить данные по операциям с балансом');
		}
	}
	
	if (isAvailable(['ozoncard_balance', 'favourites', 'notifications'])) {
	    json = callWebApi('composer-api.bx/page/json/v2?url=%2Fmy%2Fmain');
//		AnyBalance.trace('Главная: ' + JSON.stringify(json));
		
	    try {
		    var actionCards = JSON.parse(getDefaultPropName(json.widgetStates, 'actionCards'));
		} catch (e) {
            AnyBalance.trace('actionCards: ' + e.message);
        }
		
		if (actionCards) // Не во всех кабинетах доступны Ozon Карты, путь может отсутствовать
		    var cards = actionCards.cards;
        
		if (cards && cards.length > 0) {
			AnyBalance.trace('Найдено Ozon Карт: ' + cards.length);
		    for(var i = 0; i<cards.length; i++){
				var card = cards[i];
	        	var cardBal = (i >= 1 ? 'ozoncard_balance' + (i + 1) : 'ozoncard_balance');
		    	getParam(card.subtitle.text, result, cardBal, null, null, parseBalance);
		    }
        }else{
			AnyBalance.trace('Не удалось получить данные по Ozon Картам');
		}
		
		try {
		    var favorites = JSON.parse(getDefaultPropName(json.widgetStates, 'favoriteCounter'));
		} catch (e) {
            AnyBalance.trace('favorites: ' + e.message);
        }
		
		if (favorites) {
			getParam(0|favorites.counter, result, 'favourites', null, null, parseBalance);
        }else{
			AnyBalance.trace('Не удалось получить данные по избранному');
		}
		
		try {
		    var menu = JSON.parse(getDefaultPropName(json.widgetStates, 'menu'));
		} catch (e) {
            AnyBalance.trace('menu: ' + e.message);
        }
		
		if (menu && menu.sections && menu.sections.length > 0) {
		    for(var i=0; menu.sections && i<menu.sections.length; ++i){ // Получаем количество сообщений
		    	var section = menu.sections[i];
				if (section.title == 'Заказы'){ // Виджет Сообщения здесь находится
					for(var j=0; section.items && j<section.items.length; ++j){ // Получаем количество сообщений с бейджа
					    var item = section.items[j];
				        if (item.title == 'Сообщения'){
						    if (!item.notification){
						        getParam(0, result, 'notifications', null, null, parseBalance);
						    }else{
							    getParam(item.notification.badge.text, result, 'notifications', null, null, parseBalance);
						    }
				        	break;
			            }
					}
					
					break;
		        }
		    }
		}else{
			AnyBalance.trace('Не удалось получить данные по сообщениям');
		}
	}
	
	if (isAvailable(['active_orders', 'order_date', 'order_sum', 'weight', 'ticket', 'state'])) {
		json = callWebApi('composer-api.bx/page/json/v2?url=%2Fmy%2Forderlist');
//		AnyBalance.trace('Заказы: ' + JSON.stringify(json));
		
		try {
		    var ola = JSON.parse(getDefaultPropName(json.widgetStates, 'orderList'));
		} catch (e) {
            AnyBalance.trace('ola: ' + e.message);
        }
		
		if (ola && ola.orderList && ola.orderList.length > 0) {
			result.active_orders = 0;
		    for(var i=0; ola.orderList && i<ola.orderList.length; ++i){ // Получаем количество активных заказов
		    	var order = ola.orderList[i];
				var state = (order.sections[0].status && order.sections[0].status.name) || (order.sections[0].statusProvider && order.sections[0].statusProvider.status.text);
				if(state != 'Получен' && state != 'Получено' && state != 'Отменён' && state != 'Отменен' && state != 'Отменено')
					sumParam(1, result, 'active_orders', null, null, parseBalanceSilent, aggregate_sum);
		    }
			
			var order = ola.orderList[0];
		    AnyBalance.trace('Нашли ' + order.header.title + ' ' + order.header.number);
		    var state = (order.sections[0].status && order.sections[0].status.name) || (order.sections[0].statusProvider && order.sections[0].statusProvider.status.text);
			getParam(order.header.title, result, 'order_date', null, null, parseSmallDateSilent);
			getParam(order.header.payment.totalPrice, result, 'order_sum', null, null, parseBalance);
		    getParam(order.header.number, result, 'ticket');
			getParam(state, result, 'state');
			if(!result.order_sum){ // Если сумму заказа не нашли, получаем её из деталей заказа
			    if(order.weblink){
			    	json = callWebApi('composer-api.bx/page/json/v2?url=' + order.weblink);
					try {
		                var oExt = JSON.parse(getDefaultPropName(json.widgetStates, 'orderTotal'));
		            } catch (e) {
                        AnyBalance.trace('oExt: ' + e.message);
                    }
					
		            if(oExt && oExt.footer && oExt.footer.price && oExt.footer.price.price)
                        getParam(oExt.footer.price.price, result, 'order_sum', null, null, parseBalance);
			    }else{
			        AnyBalance.trace('Не удалось получить ссылку на последний заказ');
		        }
			}
			result.summary = order.header.title + ' №' + order.header.number + ' на сумму ' + order.header.payment.totalPrice + ': ' + state;
        }else{
			AnyBalance.trace('Не удалось получить данные по последнему заказу');
		}
	}
	
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


function loadProtectedPage(url, headers){
        var html = AnyBalance.requestGet(url, headers);
    
	if(/<input[^>]+id="challenge"/i.test(html)) {
        	AnyBalance.trace("Требуется обойти защиту от роботов");
		clearAllCookies();

                const bro = new BrowserAPI({
                    provider: 'ozon-v1',
                    userAgent: headers["user-agent"],
                    win: true,
                    headful: false,
                    userInteraction: false,
                    singlePage: true,
                    rules: [{
                        resType: /^(image|stylesheet|font)$/.toString(),
                        action: 'abort',
                    }, {
                        url: /www.ozon.ru\/($|\?|abt)/.toString(),
                        action: 'request',
                    }, {
                        url: /abt-challenge.*\.js/.toString(),
                        action: 'cache',
                	valid: 360*1000
                    }, {
                        url: /.*/.toString(),
                        action: 'abort',
                    }],
                    debug: false //AnyBalance.getPreferences().debug
                });
                
                const r = bro.open(url);
                try {
                    bro.waitForLoad(r.page);
                    html = bro.content(r.page).content;
                    const cookies = bro.cookies(r.page, url);
                    BrowserAPI.useCookies(cookies);
                } finally {
                    bro.close(r.page);
                }
                
                if(!/<title[^>]*>[^<]*OZON/i.test(html))
                    throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');
                
                AnyBalance.trace("Защита OZON успешно пройдена");
                
                if(!g_savedData) {
                    const prefs = AnyBalance.getPreferences();
                    g_savedData = new SavedData('ozon', prefs.login);
                }
                
                g_savedData.setCookies();
                g_savedData.save();

    }

    return html;
}

