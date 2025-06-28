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
	
	AnyBalance.trace('Запрос: ' + url);
	
	var html = AnyBalance.requestPost(url, params, headers, {HTTP_METHOD: params ? 'POST' : 'GET'});
	var json = {};
	if(html){
		json = JSON.parse(html);
		if(json.message || (json.error_description && !/Security code[\s\S]*?empty/i.test(json.error_description))){
			AnyBalance.trace(html);
			var error = json.message || json.error_description || 'Ошибка обращения к API';
			throw new AnyBalance.Error(error, null, /парол|Msisdn not found|password/i.test(error));
		}
	}
	
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	
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

	var code = AnyBalance.retrieveCode('Пожалуйста, введите код из SMS, отправленного на ваш номер T2', null, {inputType: 'number', time: 180000});
	
	json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/token?msisdn=7' + prefs.login + '&action=auth&authType=sms', {
		__post: true,
		username: '7' + prefs.login,
		password: code,
		grant_type: 'password',
		client_id: 'android-app',
		password_type:	'sms_code'
	});
	
	if(json.error && /Security code[\s\S]*?empty/i.test(json.error_description)){
		AnyBalance.trace('T2 затребовал код подтверждения из письма');
	    
	    json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/credential-management/security-codes', {
		    username: '7' + prefs.login
	    });
	    
	    var securityCodeToken = json.security_code_token;
	    var securityCode = AnyBalance.retrieveCode('Пожалуйста, введите код из письма, отправленного на ваш E-mail', null, {inputType: 'number', time: 180000});
        
		json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/token?msisdn=7' + prefs.login + '&action=auth&authType=sms', {
		    __post: true,
		    username: '7' + prefs.login,
		    password: code,
			security_code: securityCode,
            security_code_token: securityCodeToken,
		    grant_type: 'password',
		    client_id: 'android-app',
		    password_type:	'sms_code'
	    });
	}

	saveTokens(json);
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
		password_type:	'password'
	});
	
	if(json.error && /Security code[\s\S]*?empty/i.test(json.error_description)){
		AnyBalance.trace('Теле2 затребовал код подтверждения из письма');
	    
	    json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/credential-management/security-codes', {
		    username: '7' + prefs.login
	    });
	    
	    var securityCodeToken = json.security_code_token;
	    var securityCode = AnyBalance.retrieveCode('Пожалуйста, введите код из письма, отправленного на ваш E-mail', null, {inputType: 'number', time: 180000});
        
	    json = callApi('https://sso.tele2.ru/auth/realms/tele2-b2c/protocol/openid-connect/token?msisdn=7' + prefs.login + '&action=auth&authType=pass', {
		    __post: true,
		    username: '7' + prefs.login,
		    password: prefs.password,
			security_code: securityCode,
            security_code_token: securityCodeToken,
		    grant_type: 'password',
		    client_id: 'android-app',
		    password_type:	'password'
	    });
	}

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

    AnyBalance.trace('Пробуем получить баланс и тариф');

    var maxTries = 3;

    if(AnyBalance.isAvailable('balance')){
        for(var i = 0; i < maxTries; i++) {
            try {
                AnyBalance.trace('Получаем баланс, попытка: ' + (i+1));
                var html = AnyBalance.requestGet(baseurl + 'api/subscribers/' + subsid + '/balance', addHeaders({
                	Accept: '*/*',
                	'X-Requested-With': 'XMLHttpRequest',
                	Referer: baseurl
                }));
        
                var json = getJson(html);
        
                getParam(json.data.value, result, 'balance');
        
                AnyBalance.trace('Успешно получили баланс: ' + html);
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
                AnyBalance.trace('Получаем тариф, попытка: ' + (i+1));
                html = AnyBalance.requestGet(baseurl + 'api/subscribers/' + subsid + '/tariff', addHeaders({
                	Accept: '*/*',
                	'X-Requested-With': 'XMLHttpRequest',
                	Referer: baseurl
                }));
        
                var json = getJson(html);
        
                getParam(json.data.frontName, result, 'tariff');
        
                AnyBalance.trace('Успешно получили тариф: ' + html);
                break;
            }
            catch(e) {
                AnyBalance.trace('Не удалось получить тариф, пробуем еще раз...');
            }
        }
    }
}

function processRemainders(result){
    if (!AnyBalance.isAvailable('remainders', 'tariff_abon', 'tariff_till', 'statuslock'))
        return;

    AnyBalance.trace('Пробуем получить дискаунты');

    try {
        if(!result.remainders)
            result.remainders = {};

        var subsid = getSubscriberId();
		
        var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + '/rests', addHeaders({
        	Accept: '*/*',
        	'X-Requested-With': 'XMLHttpRequest',
        	Referer: baseurl
        }));

        json = JSON.parse(html);
		AnyBalance.trace('Успешно получили дискаунты: ' + html);
		
		var status = {active: 'Номер не блокирован', blocked: 'Номер заблокирован'};
		
		if (json.data) {
		    if (json.data.tariffCost && json.data.tariffCost.amount) 
			    getParam(json.data.tariffCost.amount, result, 'tariff_abon', null, null, parseBalance);
	        if (json.data.abonentDate) 
			    getParam(json.data.abonentDate, result, 'tariff_till', null, null, parseDateISO);
		    if (json.data.tariffStatus) 
			    getParam(status[json.data.tariffStatus]||json.data.tariffStatus, result, 'statuslock');
		}
		
        if (json.data && json.data.rests && json.data.rests.length && json.data.rests.length > 0) {
		    for (var i = 0; i<json.data.rests.length; ++i) {
                var discount = json.data.rests[i];
                getDiscount(result.remainders, discount);
            }
        } else {
			AnyBalance.trace("Дискаунты не найдены. Возможно, тариф не предоставляет пакеты");
		}	
    } catch(e) {
        AnyBalance.trace("Не удалось получить данные о дискаунтах: " + e.message);
    }
}

function getDiscount(result, discount) {
    var name = discount.service.name;
    var units = discount.uom;
    AnyBalance.trace('Найден дискаунт: ' + name + ' (' + units + ')');

    if(discount.limit === 0)
    	return; //Empty discount
	
    if (/min/i.test(units)) {
        //Минуты
        if (discount.roamingPackage === true) { // Это минуты в роуминге
			sumParam(Math.round(discount.remain*100)/100, result, 'remainders.min_roaming', null, null, null, aggregate_sum);
			sumParam(discount.endDay || undefined, result, 'remainders.min_roaming_till', null, null, parseDateISO, aggregate_min);
		} else {
		    sumParam(Math.round(discount.remain*100)/100, result, 'remainders.min_left', null, null, null, aggregate_sum);
		    sumParam(Math.round((discount.limit)*100/100), result, 'remainders.min_total', null, null, null, aggregate_sum);
            sumParam(Math.round((discount.limit - discount.remain)*100/100), result, 'remainders.min_used', null, null, null, aggregate_sum);
            sumParam(discount.endDay || undefined, result, 'remainders.min_till', null, null, parseDateISO, aggregate_min);
		}
    } else if (/[кмгkmg][bб]/i.test(units)) {
        //трафик
        var left = parseTraffic(discount.remain + discount.uom);
        var total = parseTraffic(discount.limit + discount.uom);
		if (discount.roamingPackage === true) { // Это трафик в роуминге
			sumParam(left, result, 'remainders.traffic_roaming', null, null, null, aggregate_sum);
			sumParam(discount.endDay || undefined, result, 'remainders.traffic_roaming_till', null, null, parseDateISO, aggregate_min);
		} else {
            sumParam(left, result, 'remainders.traffic_left', null, null, null, aggregate_sum);
		    sumParam(total, result, 'remainders.traffic_total', null, null, null, aggregate_sum);
            sumParam(total - left, result, 'remainders.traffic_used', null, null, null, aggregate_sum);
            sumParam(discount.endDay || undefined, result, 'remainders.traffic_till', null, null, parseDateISO, aggregate_min);
		}
    } else if (/pcs/i.test(units)) {
        //СМС/ММС
		if (discount.roamingPackage === true) { // Это СМС/ММС в роуминге
			sumParam(discount.remain, result, 'remainders.sms_roaming', null, null, null, aggregate_sum);
			sumParam(discount.endDay || undefined, result, 'remainders.sms_roaming_till', null, null, parseDateISO, aggregate_min);
		} else {
            sumParam(discount.remain, result, 'remainders.sms_left', null, null, null, aggregate_sum);
		    sumParam(discount.limit, result, 'remainders.sms_total', null, null, null, aggregate_sum);
            sumParam(discount.limit - discount.remain, result, 'remainders.sms_used', null, null, null, aggregate_sum);
            sumParam(discount.endDay || undefined, result, 'remainders.sms_till', null, null, parseDateISO, aggregate_min);
		}
    } else {
        AnyBalance.trace("Неизвестный дискаунт: " + JSON.stringify(discount));
    }
}

function processPayments(result){
    if (!AnyBalance.isAvailable('month_refill', 'payments'))
        return;

    AnyBalance.trace("Пробуем получить платежи за текущий месяц");

    var subsid = getSubscriberId();
	
	var dt = new Date();
	var fromDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + '01';
	var toDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
	
	try {
		var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + "/payments?fromDate=" 
		    + fromDate + "T00%3A00%3A00%2B03%3A00&toDate="
		    + toDate + "T23%3A59%3A59%2B03%3A00", g_headers);
		
		var json = getJson(html);
	} catch (e) {}
	
	if(!json || !json.data) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось получить платежи за текущий месяц, может их просто нет?');
		return;
	}
	
	AnyBalance.trace('Платежи за текущий месяц: ' + JSON.stringify(json));
	
	for (var i = 0; i < json.data.length; ++i) {
        var ref = json.data[i];
		
		sumParam(ref.sum.amount, result, 'month_refill', null, null, parseBalanceSilent, aggregate_sum);
    }
	
	AnyBalance.trace("Пробуем получить платежи за последние 3 месяца");
	
	try {
		var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + "/payments?fromDate=" 
		    + getFormattedDate({format: 'YYYY-MM-DD', offsetMonth:3}) + "T00%3A00%3A00%2B03%3A00&toDate="
		    + getFormattedDate({format: 'YYYY-MM-DD'}) + "T23%3A59%3A59%2B03%3A00", g_headers);
		
		var json = getJson(html);
	} catch (e) {}
	
	if(!json || !json.data) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось получить платежи за последние 3 месяца, может их просто нет?');
		return;
	}
	
	AnyBalance.trace('Платежи за последние 3 месяца: ' + JSON.stringify(json));
    result.payments = [];
	
    for (var i = 0; i < json.data.length; ++i) {
        var pmnt = json.data[i];
        var p = {};

        getParam(pmnt.sum.amount, p, 'payments.sum', null, null, parseBalanceSilent);
        getParam(pmnt.payDate, p, 'payments.date', null, null, parseDateISO);
		getParam(pmnt.type, p, 'payments.descr');

        result.payments.push(p);
    }
}

function processExpenses(result){
    if (!AnyBalance.isAvailable('expenses_curr_month', 'expenses_prev_month'))
        return;

    AnyBalance.trace("Пробуем получить расходы за текущий месяц");

    var subsid = getSubscriberId();
	
	var dt = new Date();
	var month = dt.getFullYear() + '-' + n2(dt.getMonth()+1);
	
	try {
		var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + "/charges?month=" + month, addHeaders({
            'X-API-Version': '1',
        }));
		
		var json = getJson(html);
	} catch (e) {}
	
	if(!json || !json.data) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось получить расходы за текущий месяц, может их просто нет?');
		return;
	}
	
	AnyBalance.trace('Расходы за текущий месяц: ' + JSON.stringify(json));
	
	for (var i = 0; i < json.data.length; ++i) {
        var exp = json.data[i];
		
		sumParam(exp.amount.amount, result, 'expenses_curr_month', null, null, parseBalanceSilent, aggregate_sum);
    }
	
	AnyBalance.trace("Пробуем получить расходы за прошлый месяц");
	
    var dt = new Date();
	var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
    var prevMonth = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1);
	
	try {
		var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + "/charges?month=" + prevMonth, addHeaders({
            'X-API-Version': '1',
        }));
		
		var json = getJson(html);
	} catch (e) {}
	
	if(!json || !json.data) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось получить расходы за прошлый месяц, может их просто нет?');
		return;
	}
	
	AnyBalance.trace('Расходы за прошлый месяц: ' + JSON.stringify(json));
	
	for (var i = 0; i < json.data.length; ++i) {
        var exp = json.data[i];
		
		sumParam(exp.amount.amount, result, 'expenses_prev_month', null, null, parseBalanceSilent, aggregate_sum);
    }
}

function processServices(result){
    if (!AnyBalance.isAvailable('services'))
        return;

    AnyBalance.trace("Пробуем получить список услуг");

    var subsid = getSubscriberId();
	
	try {
		var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + "/services", g_headers);
		
		var json = getJson(html);
	} catch (e) {}
	
	if(!json || !json.data) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось получить список услуг, может их просто нет?');
		return;
	}
	
//	AnyBalance.trace('Servises list json: ' + JSON.stringify(json));
    result.services = {};
	
    getParam(0, result.services, 'services.services_free');
	getParam(0, result.services, 'services.services_paid');
	getParam(0, result.services, 'services.services_total');
	getParam(0, result.services, 'services.services_abon');
	
	for (var i = 0; i < json.data.length; ++i) {
        var srvs = json.data[i];
		
        if(srvs.status != "CONNECTED") // Доступные к подключению услуги пропускаем
			continue
		AnyBalance.trace('Найдена услуга ' + srvs.name);

		if(srvs.abonentFee.amount == 0 || srvs.abonentFee.amount == null){
			AnyBalance.trace('Это бесплатная услуга');
			sumParam(1, result.services, 'services.services_free', null, null, parseBalanceSilent, aggregate_sum);
			sumParam(1, result.services, 'services.services_total', null, null, parseBalanceSilent, aggregate_sum);
		}else if(srvs.abonentFee.amount != 0){
			AnyBalance.trace('Это платная услуга');
			var dt = new Date();
			sumParam(1, result.services, 'services.services_paid', null, null, parseBalanceSilent, aggregate_sum);
            
		    if(srvs.abonentFee.period == 'day'){
                var cp = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate(); // Дней в этом месяце
				var cpt = 'в сутки';
            }else{
                var cp = 1;
				var cpt = 'в месяц';
            }
		    AnyBalance.trace('Платная услуга ' + srvs.name + ': ' + srvs.abonentFee.amount + ' ₽ ' + cpt);
		    sumParam(srvs.abonentFee.amount*cp, result.services, 'services.services_abon', null, null, parseBalanceSilent, aggregate_sum);
			sumParam(1, result.services, 'services.services_total', null, null, parseBalanceSilent, aggregate_sum);
		}
	}
}

function processInfo(result){
    if(!AnyBalance.isAvailable('info'))
        return;

    AnyBalance.trace('Пробуем получить профиль');
	
	try {
	    var subsid = getSubscriberId();

        var info = result.info = {};

        var html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + '/profile', addHeaders({
    	    Accept: '*/*',
    	    'X-Requested-With': 'XMLHttpRequest',
    	    Referer: baseurl
        }));
	
	    var json = JSON.parse(html);
	    AnyBalance.trace('Успешно получили профиль: ' + html);

        if (json.data) {
		    if (json.data.fullName) 
			    getParam(json.data.fullName, info, "info.fio");
            if (subsid) 
			    getParam(subsid.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4'), info, "info.mphone");
            var address = '';
		    if (json.data.address) {
				if (json.data.address.city) 
				    address += json.data.address.city;
			    if (json.data.address.street) 
				    address += (address ? ', ' : '') + json.data.address.street;
			    if (json.data.address.house) 
				    address += (address ? ', ' : '') + json.data.address.house;
			}
			getParam(address || 'Не указан', info, "info.address");
            getParam(json.data.email || 'Не указан', info, "info.email");
		}
	} catch(e) {
        AnyBalance.trace("Не удалось получить данные о профиле: " + e.message);
    }
}
