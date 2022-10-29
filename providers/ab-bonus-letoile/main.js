/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'content-type': 'application/json; charset=UTF-8',
    'origin': 'https://www.letu.ru',
    'referer': 'https://www.letu.ru/login'
}

var g_currency = {
	RU: '₽',
	UA: '₴'
};

var g_type = {
	10: 'Рубиновая',
	15: 'Сапфировая',
	20: 'Аметистовая',
	25: 'Бриллиантовая'
};

function main () {
    var prefs = AnyBalance.getPreferences ();
	AnyBalance.setDefaultCharset('utf-8'); 
	
    var loc = prefs.loc || 'RU';
    var baseurl = 'https://www.letu.' + loc + '/';
	
    AnyBalance.restoreCookies();
	
	var html = AnyBalance.requestGet(baseurl + 's/api/session/v2/confirmations');
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}

    var json = getJson(html);
    var siteId = json.siteId;
	var setItem = json.confirmation;
	
    var html = AnyBalance.requestGet(baseurl + 'rest/model/atg/userprofiling/ClientActor/extendedProfileInfo?pushSite=' + siteId + '&_=' + (new Date().getTime()));
    
	var json = getJson(html);
    if (!json.profile.lastName){
        AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        checkEmpty (prefs.login, 'Введите логин!');
        checkEmpty (prefs.password, 'Введите пароль!');
        
        var html = AnyBalance.requestGet(baseurl + 's/api/session/v2/confirmations');
        
        var json = getJson(html);
        var siteId = json.siteId;
	    var setItem = json.confirmation;
	
        if (!siteId && !setItem) throw new AnyBalance.Error ('Не удалось найти параметры авторизации. Сайт изменен?');
		
	    var html = AnyBalance.requestGet(baseurl+'s/api/user/account/v1/verifications/email?pushSite=' + siteId + '&email=' + encodeURIComponent(prefs.login), g_headers);
	    var json = getJson(html);
        if (json.exists != true){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Пользователь с таким e-mail не зарегистрирован');
	    }
	
	    var html = AnyBalance.requestPost(baseurl+'s/api/user/account/v2/authorizations/email?pushSite=' + siteId, JSON.stringify({
	        email: prefs.login,
	        password: prefs.password
    	}), g_headers);
	    
        if (/<title>Error<\/title>/i.test(html)) {
        	var err = getElement(html, /<body>/, replaceTagsAndSpaces);
        	if (err) throw new AnyBalance.Error (err, false, true);
	    	
            throw new AnyBalance.Error ('Не удалось войти в личный кабинет. Сайт изменен?', false, true);
        }
	
        var json=getJson(html);
	    if (json.errors && json.errors.length>0){
	    	var error = (json.errors || []).map(function(e) { return e.message }).join('\n');
	    	throw new AnyBalance.Error(error, false, /парол/i.test());	
	    	
	    	throw new AnyBalance.Error ('Не удалось войти в личный кабинет. Сайт изменен?', false, true);
        }
	    
        var html = AnyBalance.requestGet(baseurl + 'rest/model/atg/userprofiling/ClientActor/extendedProfileInfo?pushSite=' + siteId + '&_=' + (new Date().getTime()));
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}

    var json = getJson(html);
	AnyBalance.trace('Профиль: ' + html);

    var result = {success: true};
	
	getParam(json.profile.cardBalance, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(g_currency[loc]||'', result, ['currency', 'balance']);
//  getParam(json.profile.cardDiscount, result, 'discount');
//  getParam(json.profile.cardTypeName, result, '__tariff');
	getParam(json.profile.phoneNumber + '', result, 'phone', null, [/.*(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4']);
	getParam(json.profile.firstName + ' ' + json.profile.lastName, result, 'fio');
		
	if (isAvailable(['bonuses_active', 'bonuses_inactive', 'discount', '__tariff', 'bonuses_total', 'purchase_total', 'number'])) {
	    var html = AnyBalance.requestGet(baseurl + 's/api/user/card/loyalty/v1?_dynSessConf=' + setItem);
	
	    var json = getJson(html);
	    AnyBalance.trace('Карта: ' + html);
	    
	    getParam(json.balance, result, 'bonuses_active', null, null, parseBalance);
		getParam(json.inactiveBalance, result, 'bonuses_inactive', null, null, parseBalance);
	    getParam(json.total, result, 'bonuses_total', null, null, parseBalance);
	    getParam(json.totalPurchaseSum, result, 'purchase_total', null, null, parseBalance);
		getParam(json.discount, result, 'discount');
	    getParam(json.cardNumber + '', result, 'number', null, [/(\d{3})(\d{3})(\d*)/i, '$1 $2 $3']);
		getParam(json.cardNumber + '', result, '__tariff', null, [/(\d{3})(\d{3})(\d*)/i, '$1 $2 $3']);
	}
	
	if (isAvailable(['orders', 'favorite', 'notifications'])) {
	    var html = AnyBalance.requestGet(baseurl + 's/api/user/account/v1/counters?pushSite=' + siteId);
	
	    var json = getJson(html);
	    AnyBalance.trace('Сводка: ' + html);
	    
	    getParam(json.orders, result, 'orders', null, null, parseBalance);
		getParam(json.wishList, result, 'favorite', null, null, parseBalance);
	    getParam(json.unreadBellNotifications, result, 'notifications', null, null, parseBalance);
	}
	
	if (isAvailable(['bonuses_burn', 'bonuses_till'])) {
	    var html = AnyBalance.requestGet(baseurl + 's/api/user/card/loyalty/bonus/v1/expiring-points?_dynSessConf=' + setItem);
	
	    var json = getJson(html);
	    AnyBalance.trace('Сгорание баллов: ' + html);
	
	    getParam(json.amount, result, 'bonuses_burn', null, null, parseBalance);
	    getParam(json.date, result, 'bonuses_till', null, null, parseDateISO);
	}
	
	if (isAvailable(['last_order_sum', 'last_order_num'])) {
		var html = AnyBalance.requestGet(baseurl + 's/api/user/order/v1/history?pushSite=' + siteId + '&offset=0&count=2');
        var json = getJson(html);
	    AnyBalance.trace('Заказы: ' + html);

		var orders = json.orders;
		if (orders && orders.length>0) {
		    for(var i=0; orders && i<orders.length; ++i){
		    	var order = orders[i];
		    	AnyBalance.trace('Нашли заказ № ' + order.id);
                getParam(order.amount, result, 'last_order_sum', null, null, parseBalance);
		    	getParam(order.id, result, 'last_order_num');
				
			    break;
		    }
        }else{
			AnyBalance.trace('Не удалось получить данные по последнему заказу');
		}
	}

	AnyBalance.saveCookies();
	AnyBalance.saveData();

   AnyBalance.setResult (result);
}