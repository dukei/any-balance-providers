/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
};

var g_apiHeaders = {
	'Accept': '*/*',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Content-type': 'application/json',
	'Origin': 'https://multibonus.ru',
	'Referer': 'https://multibonus.ru/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
};

var g_statuses = {
	CANCELED: 'Отменен',
	IN_PROCESSING: 'В обработке',
	DELIVERY_WAITING: 'Ожидает доставки',
	IN_DELIVERY: 'В доставке',
	REGISTERED: 'Зарегистрирован',
	WAITING_FOR_PAYMENT: 'Ожидает оплаты',
	DELIVERED: 'Доставлен',
	NOT_DELIVERED: 'Не доставлен',
	undefined: 'Не определен'
};

var baseurl = 'https://multibonus.ru/mp-pl-b2c-gateway/api/v1/';

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    prefs.login = prefs.login.replace(/[^\d]*/g, '').substr(-10);
    if (!/^\d{10}$/.test(prefs.login))
		throw new AnyBalance.Error('Неверный номер телефона!');
	
	AnyBalance.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + 'Authorize', g_apiHeaders);
	AnyBalance.trace(html);
	
    if(!html || AnyBalance.getLastStatusCode() == 401){
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookiesExceptProtection();
	    
		var html = loadProtectedPage(('https://multibonus.ru/', g_headers));
	    
	    html = AnyBalance.requestPost(baseurl + 'token', JSON.stringify({
			password: prefs.password, 
			phoneNumber: '7' + prefs.login
		}), g_apiHeaders, {httpMethod: 'PUT'});
	    AnyBalance.trace(html);
	
	    if(!html || AnyBalance.getLastStatusCode() >= 400){
	    	AnyBalance.trace('LastStatusCode: ' + AnyBalance.getLastStatusCode() + '\n' + html);
            clearAllCookies();
            AnyBalance.saveCookies();
    	    AnyBalance.saveData();
	    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже');
	    }
		
	    var json = getJson(html);
		
	    if (!json.Success) {
			var error = json.Error;
			if(error){
				if(error == 'invalid_grant')
				    throw new AnyBalance.Error('Неверный номер телефона или пароль', null, true);
			    else
					throw new AnyBalance.Error(error, null, true);
			}
			
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
		
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
	}

	var result = {success: true};
	
    var html = AnyBalance.requestGet(baseurl + 'accounts', g_apiHeaders);
	AnyBalance.trace(html);
	
	var json = getJson(html);
	
	getParam(json.availableBalanceInRur, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
	if(AnyBalance.isAvailable('cardnum', 'cardnum2', 'cardnum3', 'cardnum4', 'cardnum5', 'cardregdate', 'cardregdate2', 'cardregdate3', 'cardregdate4', 'cardregdate5', 'phone', 'fio')) {
	   try{
        	var html = AnyBalance.requestGet(baseurl + 'clients/profile', g_apiHeaders);
			AnyBalance.trace(html);
			
	        json = getJson(html);
			
			var cards = json.cards;
	        if(cards && cards.length > 0){
	        	AnyBalance.trace('Найдено привязанных карт: ' + cards.length);
	         	getParam(cards[0].maskedCardNumber.replace(/(.*)(\d{4})$/i, '**** $2'), result, '__tariff');
	        	for(var i = 0; i<cards.length; i++){
	        		var mcard = (i >= 1 ? 'cardnum' + (i + 1) : 'cardnum');
//	            	var mregdate = (i >= 1 ? 'cardregdate' + (i + 1) : 'cardregdate');
	        	   	getParam(cards[i].maskedCardNumber.replace(/(.*)(\d{4})$/i, '**** $2'), result, mcard);
//	        		getParam(cards[i].CreatedDate.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, mregdate, null, null, parseDate);
	        	}
	        }else{
 	        	AnyBalance.trace('Не удалось получить данные по картам');
 	        }
			
			getParam(json.clientProfile.email, result, 'email');
			getParam(json.clientProfile.phoneNumber.replace(/.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'), result, 'phone');
			
	        var fio = json.clientProfile.firstName;
	        if(json.clientProfile.middleName)
		        fio += ' ' + json.clientProfile.middleName;
	        if(json.clientProfile.lastName)
		        fio += ' ' + json.clientProfile.lastName;
	        getParam(fio, result, 'fio', null, null, capitalFirstLetters);
	    }catch(e){
	   	    AnyBalance.trace(e.message)
		}
	}
	
	if(AnyBalance.isAvailable('lastopersum', 'lastoperdate', 'lastoperdesc')) {
		var html = AnyBalance.requestGet(baseurl + 'accounts/transactions?loyaltyProgram=VTB&dateTo=' + encodeURIComponent(new Date().toJSON()) + '&dateFrom=1900-01-31T21%3A29%3A43.000Z', g_apiHeaders);
	    AnyBalance.trace(html);
			
	    json = getJson(html);
			
        var opr_dir = '';
		var opers = json.transactions;
	    if(opers && opers.length > 0){
	    	AnyBalance.trace('Найдено операций: ' + opers.length);
			var opr = opers[0];
			if(!/BURN|SPENDING/i.test(opr.transactionType)){
				opr_dir = '+';
			}else{
				opr_dir = '-';
			}
			getParam(opr_dir + opr.transactionAmount, result, 'lastopersum', null, null, parseBalance);
	    	getParam(opr.transactionDate, result, 'lastoperdate', null, null, parseDateISO);
	    	var oprDesc = opr.transactionDescription;
			if(oprDesc !== null && opr.transactionType !== 'SPENDING'){ // Для списаний не дает описания операции
				result.lastoperdesc = oprDesc;
			}else{
				result.lastoperdesc = 'Списание мультибонусов по заказу №' + opr.orderId;
			}
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последней операции');
 	    }
    }
	
	if(AnyBalance.isAvailable('lastordernum', 'lastordersum', 'lastorderdate', 'lastorderstatus', 'lastorderpartner', 'orderstotal')) {
		var html = AnyBalance.requestPost(baseurl + 'order/history', JSON.stringify({
            "countToSkip": 0,
            "countToTake": 18,
            "statuses": [
                "CANCELED",
                "DELIVERED",
                "DELIVERY_WAITING",
                "IN_DELIVERY",
                "IN_PROCESSING",
                "NOT_DELIVERED",
                "REGISTERED",
                "WAITING_FOR_PAYMENT"
            ]
        }), g_apiHeaders);
	    AnyBalance.trace(html);
			
	    json = getJson(html);
			
        var orders = json.orders;
	    if(orders && orders.length > 0){
	    	AnyBalance.trace('Найдено заказов: ' + orders.length);
			var ord = orders[0];
			getParam(ord.orderId, result, 'lastordernum');
			getParam(ord.totalCost, result, 'lastordersum', null, null, parseBalance);
	    	getParam(ord.createdAt, result, 'lastorderdate', null, null, parseDateISO);
			getParam(g_statuses[ord.status]||ord.status, result, 'lastorderstatus');
	    	getParam(ord.partnerName, result, 'lastorderpartner');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему заказу');
 	    }
		
		getParam(json.calcTotalCount||0, result, 'orderstotal', null, null, parseBalance);
    }
	
	if(AnyBalance.isAvailable('messages')) {
		var html = AnyBalance.requestPost(baseurl + 'Message/GetThreads', JSON.stringify({
            "CountToSkip": 0,
            "CountToTake": 18,
            "Filter": 0
        }), g_apiHeaders);
	    AnyBalance.trace(html);
			
	    json = getJson(html);
		
		result.messages = 0;
		var threads = json.Threads;
		if(threads && threads.length > 0){
	        AnyBalance.trace('Найдено сообщений: ' + threads.length);
		    for(var i=0; i<threads.length; ++i){
				if(threads[i].UnreadMessagesCount !== 0){
					sumParam(1, result, 'messages', null, null, null, aggregate_sum);
				}
			}
		}else{
 	    	AnyBalance.trace('Не удалось получить данные по сообщениям');
 	    }
    }
	
	if(AnyBalance.isAvailable('subscriptions')) {
		var html = AnyBalance.requestPost(baseurl + 'subscriptions/getSubscriptions', JSON.stringify({
            "ClientContext": {
                "loyaltyPrograms": [
                    5
                ],
                "targetAudiences": [
                    "Mass"
                ],
                "kladrCode": "7800000000000",
                "account": "ruble"
            },
            "status": "Active",
            "offset": 0,
            "limit": 60
        }), g_apiHeaders);
	    AnyBalance.trace(html);
			
	    json = getJson(html);
		
		getParam(json.totalCount||0, result, 'subscriptions', null, null, parseBalance);
    }
    
	AnyBalance.setResult(result);
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://multibonus.ru/';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html)) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            provider: 'vtb-multibonus',
            userAgent: g_headers["User-Agent"],
            headful: true,
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator\/qauth_utm_v2\.js/.toString(),
                action: 'cache',
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
            additionalRequestHeaders: [
		{
                    headers: {
			'User-Agent': g_headers["User-Agent"]
		    }
		}
            ],
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

        if(/__qrator|Access to [^<]* is forbidden|Доступ к сайту [^<]* запрещен/.test(html))
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");
        AnyBalance.saveCookies();
    	AnyBalance.saveData();

    }

    return html;
}

function clearAllCookiesExceptProtection(){
	clearAllCookies(function(c){return!/qrator/i.test(c.name)})
}