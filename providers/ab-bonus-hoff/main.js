
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'X-Requested-With': 'XMLHttpRequest',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://hoff.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setOptions({
		CLIENT: "okhttp"
	});
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}
	
	if(!g_savedData)
		g_savedData = new SavedData('hoff', prefs.login);
	
	var sessId = g_savedData.get('sessId');

	g_savedData.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = loadProtectedPage((g_baseurl + '/', g_headers));
	
	if(!html || AnyBalance.getLastStatusCode() > 403){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(/iwaf/.test(html))
       	loadProtectedPageIwaf(html);

	html = AnyBalance.requestGet(g_baseurl + '/vue/me/', addHeaders({'Referer': g_baseurl + '/personal/'}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.data.error_code === 422 || AnyBalance.getLastStatusCode() == 401){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookiesExceptProtection();
    	html = login();
		json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	var user = json.data;
	
	var fio = {};
	sumParam(user.name, fio, '__n', null, null, null, create_aggregate_join(' '));
//	sumParam(user.second_name, fio, '__n', null, null, null, create_aggregate_join(' '));
	sumParam(user.last_name, fio, '__n', null, null, null, create_aggregate_join(' '));
	getParam(fio.__n, result, 'fio');
		
	getParam(user.id, result, 'user_id');
	getParam(user.email, result, 'email');
	getParam(user.phone, result, 'phone', null, replaceNumber);
	
	html = AnyBalance.requestGet(g_baseurl + '/vue/me/cardlist/', addHeaders({'Referer': g_baseurl + '/personal/'}));
	
	json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var cardNum;
	
	if(json.data && json.data.additional_data && json.data.additional_data.cards && json.data.additional_data.cards.length > 0){
	    var cards = json.data.additional_data.cards;
		var state = {'UNEXIST': 'Не активна', 'EXIST': 'Активна', 'BLOCKED': 'Заблокирована'};
		var type = {0: 'Виртуальная', 1: 'Пластиковая', 2: 'Цифровая'};
	    var cardData = cards[0];
		cardNum = cardData.number;
	    getParam(cardData.balance, result, 'balance', null, null, parseBalance); // Общая сумма баллов
	    getParam(cardData.balance_active, result, 'balance_active', null, null, parseBalance); // Активный баланс
	    getParam(cardData.number, result, 'card');
		getParam(state[cardData.STATUS]||cardData.STATUS, result, 'card_status');
		getParam(type[cardData.VIRTUAL]||cardData.VIRTUAL, result, 'card_type');
	    getParam(cardData.number, result, '__tariff');
	    if(cardData && cardData.withdrawal_count)
		    getParam(cardData.withdrawal_count, result, 'burn_count', null, null, parseBalance);
	    if(cardData && cardData.withdrawal_time)
		    getParam(cardData.withdrawal_time, result, 'burn', null, null, parseDate);
		if(cardData && cardData.soon_available && cardData.soon_available.length > 0){
		    getParam(cardData.soon_available[0].amount, result, 'soon_available', null, null, parseBalance);
		    getParam(cardData.soon_available[0].date, result, 'soon', null, null, parseDate);
		}else{
			getParam(cardData.balance - cardData.balance_active, result, 'soon_available', null, null, parseBalance);
		}
	}else{
		AnyBalance.trace('Не удалось получить информацию по картам');
	}
	
	if(AnyBalance.isAvailable(['active_orders', 'last_order_date', 'last_order_sum', 'last_order_num', 'last_order_status', 'last_order_delivery']) && cardNum){
		html = AnyBalance.requestPost(g_baseurl + '/vue/axws/', JSON.stringify({
            "alias": "slv2v1",
            "data": {
                "ShowOrderTips": true,
                "RequestSource": "ISTORE",
                "ClientIDList": [
                    {
                        "ClientIDType": "Phone",
                        "ClientIDValue": prefs.login
                    }
                ]
            }
        }), addHeaders({'Referer': g_baseurl + '/personal/'}));
	
	    json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    
	    var o = [];
		
		if(json.ActiveOrdersList && json.ActiveOrdersList.length > 0){ // Сначала проверяем активные заказы
	    	AnyBalance.trace('Найдено активных заказов: ' + json.ActiveOrdersList.length);
			o = json.ActiveOrdersList;
		}else{ // Если активных заказов нет, ищем в завершённых
			AnyBalance.trace('Найдено завершенных заказов: ' + json.CompletedOrdersList.length);
			o = json.CompletedOrdersList;
		}
		
		getParam(json.ActiveOrdersList.length, result, 'active_orders', null, null, parseBalance);
		
	    if(o && o.length > 0){
	    	getParam(o[0].OrderCreatedDateTime, result, 'last_order_date', null, null, parseDateISO);
			getParam(o[0].TotalAmount, result, 'last_order_sum', null, null, parseBalance);
	    	getParam(o[0].OrderId + (o[0].PreOrderId ? '(' + o[0].PreOrderId + ')' : ''), result, 'last_order_num');
			getParam(o[0].OrderStatus, result, 'last_order_status');
			getParam(o[0].TypeofDeliveryName, result, 'last_order_delivery');
	    }else{
 	    	AnyBalance.trace('Не удалось получить информацию по заказам');
 	    }
	}
	
	if(AnyBalance.isAvailable(['last_oper_date', 'last_oper_sum', 'last_oper_type']) && cardNum){
		html = AnyBalance.requestGet(g_baseurl + '/vue/me/cardhistory/?type=all&card=' + cardNum + '&page=1', addHeaders({'Referer': g_baseurl + '/personal/cards'}));
	
	    json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    
	    var h = json.data && json.data.cardHistory;
	    if(h && h.length > 0){
	    	AnyBalance.trace('Найдено операций с баллами: ' + h.length);
			
			var operType = {'accrual': 'Начисление', 'combustion': 'Сгорание'};
			
	    	getParam(h[0].date, result, 'last_oper_date', null, null, parseDate);
			getParam((h[0].type == 'accrual' ? h[0].accrual : -h[0].writeOff), result, 'last_oper_sum', null, null, parseBalance);
	    	getParam(operType[h[0].type]||h[0].type, result, 'last_oper_type');
	    }else{
 	    	AnyBalance.trace('Не удалось получить информацию по операциям');
 	    }
	}
	
	if(AnyBalance.isAvailable('notifications') && cardNum){
		html = AnyBalance.requestPost(g_baseurl + '/vue/axws/', JSON.stringify({
            "alias": "return_notifications_count",
            "data": {
                "hoffId": prefs.login
            }
        }), addHeaders({'Referer': g_baseurl + '/personal/'}));
	
	    json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    
	    getParam(json.messagesCount||0, result, 'notifications', null, null, parseBalance);
	}

	AnyBalance.setResult(result);
}
	
function login(){
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2 $3 $4');
	var formattedLoginHint = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
	
	var html = loadProtectedPage((g_baseurl + '/', g_headers));
	
	if(/iwaf/.test(html))
       	loadProtectedPageIwaf(html);
	
	html = AnyBalance.requestPost(g_baseurl + '/vue/main/', JSON.stringify({
        "entities": [
            "user-data",
            "main_menu",
            "breadcrumbs",
            "meta"
        ]
    }), addHeaders({
        'Content-Type': 'application/json',
		'Origin': g_baseurl,
		'Referer': g_baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	html = AnyBalance.requestPost(g_baseurl + '/vue/auth/check_contact/', JSON.stringify({
        "phone": formattedLogin
    }), addHeaders({
        'Content-Type': 'application/json',
		'Origin': g_baseurl,
		'Referer': g_baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.data.exists !== true)
       	throw new AnyBalance.Error('Личный кабинет с указанным номером телефона не существует!');
	
	html = AnyBalance.requestPost(g_baseurl + '/vue/auth/', JSON.stringify({
        "phone": formattedLogin,
        "auth_type": "standard"
    }), addHeaders({
        'Content-Type': 'application/json',
		'Origin': g_baseurl,
		'Referer': g_baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.data.code !== "ok"){
		var error = json.data.message;
      	if(error){
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
      	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + formattedLoginHint, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(g_baseurl + '/vue/auth/', JSON.stringify({
        "phone": formattedLogin,
        "sms_code": code,
        "auth_type": "standard"
    }), addHeaders({
        'Content-Type': 'application/json',
		'Origin': g_baseurl,
		'Referer': g_baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.data.code !== "ok"){
		var error = json.data.message;
      	if(error){
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error, false, true);
      	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(g_baseurl + '/vue/me/', g_headers);
	
	var sessId = json.data.sessid;
	
	g_savedData.set('sessId', sessId);
	
	g_savedData.setCookies();
	g_savedData.save();
	
	return html;
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://hoff.ru/';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html) || AnyBalance.getLastStatusCode() == 401) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
//      clearAllCookies(); // Закрываем, иначе придётся логиниться заново

        const bro = new BrowserAPI({
            provider: 'hoff-q2',
            userAgent: headers["User-Agent"],
            headful: true,
            singlePage: true,
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
		        url: /_qrator\/qauth(?:_\w+)*\.js/.toString(),
                action: 'request',
                valid: 3600*1000
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico|svg)/.toString(),
                action: 'abort',
            }, {
                url: /.*/.toString(),
                action: 'request',
            }],
            debug: AnyBalance.getPreferences().debug
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

        if(/__qrator|HTTP 40[31]/.test(html)||AnyBalance.getLastStatusCode() >= 400)
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");
        g_savedData.setCookies();
	    g_savedData.save();

    }

    return html;
}

function loadProtectedPageIwaf(html){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
    AnyBalance.trace('Сайт затребовал челлендж для iwaf');
	
	var iwafCookieName = getParam(html, null, null, /iwaf_js_cookie_([\s\S]*?)=[\s\S]*?;/i, replaceTagsAndSpaces);
	var iwafJsCookieValue = getParam(html, null, null, /iwaf_js_cookie_[\s\S]*?=([\s\S]*?);/i, replaceTagsAndSpaces);
	AnyBalance.setCookie('hoff.ru', 'iwaf_js_cookie_' + iwafCookieName, '' + iwafJsCookieValue);
	
	var html = AnyBalance.requestGet(g_baseurl + '/', addHeaders({'Referer': g_baseurl + '/iwaf-challenge'}));
	
	if(/iwaf/.test(html)||AnyBalance.getLastStatusCode()==403){
        throw new AnyBalance.Error('Не удалось установить куку iwaf. Сайт изменен?');
    }

    g_savedData.setCookies();
	g_savedData.save();

    return html;
}

function clearAllCookiesExceptProtection(){
	clearAllCookies(function(c){return!/qrator/i.test(c.name)})
}