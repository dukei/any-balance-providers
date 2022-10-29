/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Connection':'keep-alive',
	'Tele2-User-Agent': '"mytele2-app/4.27.1"; "unknown"; "Android/9"; "Build/12998710"',
	'X-API-Version': '3',
	'User-Agent':'okhttp/4.2.0'
};

var baseurl = 'https://api.tele2.ru/';

function callApi(action, params){
	var url = joinUrl(baseurl + 'api/', action);
	var headers = g_headers;
	if(params){
		if(params.__post){
			delete params.__post;
		}else{
			params = JSON.stringify(params);
			headers = addHeaders({'Content-Type': 'application/json; charset=UTF-8'});
		}
	}
	
	var html = AnyBalance.requestPost(url, params, headers, {HTTP_METHOD: params ? 'POST' : 'GET'});
	var json = {};
	if(html){
		json = JSON.parse(html);
		if(!json.data && !json.access_token && !json.current_username){
			AnyBalance.trace(html);
			var error = json.message || json.error_description || 'Ошибка обращения к API';
			throw new AnyBalance.Error(error, null, /парол|Msisdn not found|password/i.test(error));
		}
	}
	return json.data || json;
}

function login(){
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите логин - номер телефона из 10 цифр! Например, 9771234567');

	if(g_headers.Authorization)
		return; //Уже залогинены

	var ok = loginByAccessToken();
	if(!ok)
		ok = loginByRefreshToken();
	if(!ok){
		if(prefs.password){
			loginByPassword();
		}else{
			loginBySMS();
		}
	}
	
    __setLoginSuccessful();

}

function saveTokens(json){
	var prefs = AnyBalance.getPreferences();

	g_headers.Authorization = 'Bearer ' + json.access_token;

	AnyBalance.setData('login', prefs.login);
	AnyBalance.setData('ac', json.access_token);
	AnyBalance.setData('rt', json.refresh_token);
	AnyBalance.saveData();
}

function loginBySMS() {
	var prefs = AnyBalance.getPreferences();

	var json = callApi('validation/number/7' + prefs.login, {sender: 'Tele2'});

	var code = AnyBalance.retrieveCode('Пожалуйста, введите код из SMS для входа в личный кабинет Tele2', null, {inputType: 'number', time: 180000});

	json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/token?msisdn=7' + prefs.login + '&action=auth&authType=sms', {
		__post: true,
		username: '7' + prefs.login,
		password: code,
		grant_type: 'password',
		client_id: 'android-app',
		password_type:	'sms_code',
	});

	saveTokens(json);
}

function loginByAccessToken(){
	var prefs = AnyBalance.getPreferences();
	if(prefs.login !== AnyBalance.getData('login'))
		return false;

	g_headers.Authorization = 'Bearer ' + AnyBalance.getData('ac');

	try{
		json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/userinfo');
	}catch(e){
		AnyBalance.trace('Не удалось войти по access token: ' + e.message);
		return false;
	}


	AnyBalance.trace('Вошли по access token');

	return true;
}

function loginByAccessToken(){
	var prefs = AnyBalance.getPreferences();
	if(prefs.login !== AnyBalance.getData('login'))
		return false;

	g_headers.Authorization = 'Bearer ' + AnyBalance.getData('ac');

	try{
		var json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/userinfo');
	}catch(e){
		AnyBalance.trace('Не удалось войти по access token: ' + e.message);
		return false;
	}

    AnyBalance.trace('Вошли по access token');

	return true;
}

function loginByRefreshToken(){
	var prefs = AnyBalance.getPreferences();
	if(prefs.login !== AnyBalance.getData('login'))
		return false;

	delete g_headers.Authorization;

	try{
		var json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/token?action=refresh', {
			__post: true,
			refresh_token: AnyBalance.getData('rt'),
			grant_type:	'refresh_token',
			client_id:	'android-app'
		});
	}catch(e){
		AnyBalance.trace('Не удалось получить токен по refresh token: ' + e.message);
		return false;
	}

    AnyBalance.trace('Получили новый access token по refresh token');

	saveTokens(json);

	return loginByAccessToken();
}

function loginByPassword(){
	var prefs = AnyBalance.getPreferences();

	json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/token?msisdn=7' + prefs.login + '&action=auth&authType=pass', {
		__post: true,
		username: '7' + prefs.login,
		password: prefs.password,
		grant_type: 'password',
		client_id: 'android-app',
		password_type:	'password',
	});

	saveTokens(json);
}

function getSubscriberId() {
	var prefs = AnyBalance.getPreferences();
    var subsid = '7' + replaceAll(prefs.login, [/\D/g, '', /.*(\d{10})$/, '$1']);
    return subsid;
}

function processBalance(result){
    if(!AnyBalance.isAvailable('balance', 'tariff'))
        return;

    var subsid = getSubscriberId();

    AnyBalance.trace('Получаем баланс');

    var maxTries = 3;

    if(AnyBalance.isAvailable('balance')){
        for(var i = 0; i < maxTries; i++) {
            try {
                AnyBalance.trace('Пытаемся получить баланс, попытка: ' + (i+1));
                var html = AnyBalance.requestGet(baseurl + 'api/subscribers/' + subsid + '/balance', addHeaders({
                	Accept: '*/*',
                	'X-Requested-With': 'XMLHttpRequest',
                	Referer: baseurl
                }));
        
                var json = getJson(html);
        
                getParam(json.data.value, result, 'balance');
        
                AnyBalance.trace('Успешно получили баланс');
                break;
            }
            catch(e) {
                AnyBalance.trace('Не удалось получить баланс, пробуем еще раз...');
            }
        }
    }

    if(AnyBalance.isAvailable('tariff')){
        for(var i = 0; i < maxTries; i++) {
            try {
                AnyBalance.trace('Пытаемся получить тариф, попытка: ' + (i+1));
                html = AnyBalance.requestGet(baseurl + 'api/subscribers/' + subsid + '/tariff', addHeaders({
                	Accept: '*/*',
                	'X-Requested-With': 'XMLHttpRequest',
                	Referer: baseurl
                }));
        
                var json = getJson(html);
        
                getParam(json.data.frontName, result, 'tariff');
        
                AnyBalance.trace('Успешно получили тариф');
                break;
            }
            catch(e) {
                AnyBalance.trace('Не удалось получить тариф, пробуем еще раз...');
            }
        }
    }

}

function processRemainders(result){
    if (!AnyBalance.isAvailable('remainders'))
        return;

    AnyBalance.trace('Получаем остатки услуг');

    try {
        if(!result.remainders)
            result.remainders = {};

        var subsid = getSubscriberId();

        AnyBalance.trace("Searching for resources left");
        var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + '/rests', addHeaders({
        	Accept: '*/*',
        	'X-Requested-With': 'XMLHttpRequest',
        	Referer: baseurl
        }));

        AnyBalance.trace('Got discounts: ' + html);
        json = JSON.parse(html);
        for (var i = 0; i<json.data.rests.length; ++i) {
            var discount = json.data.rests[i];
            getDiscount(result.remainders, discount);
        }
        
    } catch(e) {
        AnyBalance.trace("Не удалось получить данные об остатках пакетов и услуг, попробуйте позже " + e);
    }
}

function getDiscount(result, discount) {
    var name = discount.service.name;
    var units = discount.uom;
    AnyBalance.trace('Найден дискаунт: ' + name + ' (' + units + ')');

    if(discount.limit === 0)
    	return; //Empty discount

	getParam(discount.endDay, result, 'remainders.endDate', null, null, parseDateISO);
	
    if (/min/i.test(units)) {
        //Минуты
        sumParam(Math.round(discount.remain*100)/100, result, 'remainders.min_left', null, null, null, aggregate_sum);
        sumParam(Math.round((discount.limit - discount.remain)*100/100), result, 'remainders.min_used', null, null, null, aggregate_sum);
        sumParam(discount.endDay || undefined, result, 'remainders.min_till', null, null, parseDateISO, aggregate_min);
    } else if (/[кмгkmg][bб]/i.test(units)) {
        //трафик
        var left = parseTraffic(discount.remain + discount.uom);
        var total = parseTraffic(discount.limit + discount.uom);
        sumParam(left, result, 'remainders.traffic_left', null, null, null, aggregate_sum);
        sumParam(total - left, result, 'remainders.traffic_used', null, null, null, aggregate_sum);
        sumParam(discount.endDay || undefined, result, 'remainders.traffic_till', null, null, parseDateISO, aggregate_min);
    } else if (/pcs/i.test(units)) {
        //СМС/ММС
        sumParam(discount.remain, result, 'remainders.sms_left', null, null, null, aggregate_sum);
        sumParam(discount.limit - discount.remain, result, 'remainders.sms_used', null, null, null, aggregate_sum);
        sumParam(discount.endDay || undefined, result, 'remainders.sms_till', null, null, parseDateISO, aggregate_min);
    } else {
        AnyBalance.trace("Неизвестный дискаунт: " + JSON.stringify(discount));
    }
}

function processPayments(result){
    if (!AnyBalance.isAvailable('payments'))
        return;

    AnyBalance.trace("Searching for payments");

    var subsid = getSubscriberId();
	
	try {
		var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + "/payments?fromDate=" 
		    + getFormattedDate({format: 'YYYY-MM-DD', offsetMonth:3}) + "T00%3A00%3A00%2B03%3A00&toDate="
		    + getFormattedDate({format: 'YYYY-MM-DD'}) + "T23%3A59%3A59%2B03%3A00", g_headers);
		
		var json = getJson(html);
	} catch (e) {}
	
	if(!json || !json.data) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось получить последние платежи, может их просто нет?');
		return;
	}
	
	AnyBalance.trace('History json: ' + JSON.stringify(json));
    result.payments = [];
	
    for (var i = 0; i < json.data.length; ++i) {
        var pmnt = json.data[i];
        var p = {};

        getParam(pmnt.sum.amount, p, 'payments.sum', null, null, parseBalanceSilent);
		getParam(pmnt.type, p, 'payments.descr');
		
        getParam(pmnt.payDate, p, 'payments.date', null, null, parseDateISO);

        result.payments.push(p);
    }
}

function processInfo(result){
    if(!AnyBalance.isAvailable('info'))
        return;

    var subsid = getSubscriberId();

    var info = result.info = {};

    var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + '/profile', addHeaders({
    	Accept: '*/*',
    	'X-Requested-With': 'XMLHttpRequest',
    	Referer: baseurl
    }));

    var json = getJson(html);
    getParam(json.data.fullName, info, "info.fio");
    getParam(subsid.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4'), info, "info.mphone");
    getParam(json.data.address.city + ' ' + json.data.address.street + ' ' + json.data.address.house, info, "info.address");
    getParam(json.data.email || undefined, info, "info.email");
}
