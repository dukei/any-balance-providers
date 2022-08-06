/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'u-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var g_apiHeaders = {
	'Accept': '*/*',
	'Accept-Language': 'u-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Content-type': 'application/json',
	'Origin': 'https://new.multibonus.ru',
	'Referer': 'https://new.multibonus.ru/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var g_statuses = {
	Cancelled: 'Отменен',
	Processing: 'В обработке',
	DeliveryWaiting: 'Ожидает доставки',
	Delivery: 'Доставка',
	Delivered: 'Доставлен',
	NotDelivered: 'Не доставлен',
	undefined: ''
};

var baseurl = 'https://new.multibonus.ru/mp-pl-b2c-gateway/api/v1/';

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    prefs.login = prefs.login.replace(/[^\d]*/g, '').substr(-10);
    if (!/^\d{10}$/.test(prefs.login))
		throw new AnyBalance.Error('Неверный номер телефона!');
	
	AnyBalance.restoreCookies();
	
    var html = AnyBalance.requestGet(baseurl + 'Buy/GetBalance', g_apiHeaders);
	AnyBalance.trace(html);
	
    if(!html||AnyBalance.getLastStatusCode()==401){
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
	    
		var html = loadProtectedPage(('https://new.multibonus.ru/', g_headers));
	    
	    var html = AnyBalance.requestPost(baseurl + 'Token/GetToken', JSON.stringify({
			Password: prefs.password, 
			UserPhone: '7' + prefs.login
		}), g_apiHeaders, {httpMethod: 'PUT'});
	    AnyBalance.trace(html);
	
	    if(!html||AnyBalance.getLastStatusCode()>400){
	    	AnyBalance.trace('LastStatusCode: ' + AnyBalance.getLastStatusCode());
	    	AnyBalance.trace(html);
            clearAllCookies();
            AnyBalance.saveCookies();
    	    AnyBalance.saveData();
	    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже');
	    }
		
	    var json = getJson(html);
		
	    if (!json.Success) {
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в кабинет. Возможно, изменения в API');
		}
		
        var html = AnyBalance.requestGet(baseurl + 'Buy/GetBalance', g_apiHeaders);
		AnyBalance.trace(html);
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}

	var result = {success: true};
	
    json = getJson(html);
	
	getParam(json.BalanceTotal, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
	if(AnyBalance.isAvailable('cardnum', 'cardnum2', 'cardnum3', 'cardnum4', 'cardnum5', 'cardregdate', 'cardregdate2', 'cardregdate3', 'cardregdate4', 'cardregdate5', 'phone', 'fio')) {
	   try{
        	var html = AnyBalance.requestGet(baseurl + 'ClientProfile/GetStartProfile', g_apiHeaders);
			AnyBalance.trace(html);
			
	        json = getJson(html);
			
			var cards = json.Cards.Cards;
	        if(cards && cards.length > 0){
	        	AnyBalance.trace('Найдено привязанных карт: ' + cards.length);
	         	getParam('**** ' + cards[0].MaskedCardNumber, result, '__tariff');
	        	for(var i = 0; i<cards.length; i++){
	        		var mcard = (i >= 1 ? 'cardnum' + (i + 1) : 'cardnum');
	            	var mregdate = (i >= 1 ? 'cardregdate' + (i + 1) : 'cardregdate');
	        	   	getParam('**** ' + cards[i].MaskedCardNumber, result, mcard);
	        		getParam(cards[i].CreatedDate.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, mregdate, null, null, parseDate);
	        	}
	        }else{
 	        	AnyBalance.trace('Не удалось получить данные по картам');
 	        }
			
			getParam(json.Profile.ClientProfile.Phones[0].PhoneNumber.replace(/.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'), result, 'phone');
			
	        fio = capitalFirstLetters(json.Profile.ClientProfile.FirstName + ' ' + json.Profile.ClientProfile.MiddleName + ' ' + json.Profile.ClientProfile.LastName);
			getParam(fio, result, 'fio');
	    }catch(e){
	   	    AnyBalance.trace(e.message)
		}
	}
	
	if(AnyBalance.isAvailable('lastopersum', 'lastoperdate', 'lastoperdesc')) {
        var html = AnyBalance.requestPost(baseurl + 'Processing/GetOperationHistory', JSON.stringify({
            "filterDateFlag": "procdate",
            "loyaltyProgramId": 5,
            "rowCount": -1,
            "skipCount": 0,
            "cardId": null,
            "fromDate": "1900-01-31T21:29:43.000Z",
            "toDate": new Date().toJSON()
        }), g_apiHeaders);
	    AnyBalance.trace(html);
			
	    json = getJson(html);
			
        var opers = json.OperationHistory;
	    if(opers && opers.length > 0){
	    	AnyBalance.trace('Найдено операций: ' + opers.length);
			var opr = opers[0];
	    	getParam(opr.OperationSum, result, 'lastopersum', null, null, parseBalance);
	    	getParam(opr.TransactionProcDateTime.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'lastoperdate', null, null, parseDate);
	    	var oprDesc = opr.OperationDesc;
			if (oprDesc !== null && opr.OperationTypeCode !== 'W'){
				result.lastoperdesc = oprDesc;
			}else{
				result.lastoperdesc = 'Списание мультибонусов по заказу №' + opr.TransactionExternalId.replace(/(\d+)_(\d+)/,'$1');
			}
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последней операции');
 	    }
    }
	
	if(AnyBalance.isAvailable('lastordernum', 'lastordersum', 'lastorderdate', 'lastorderstatus', 'lastorderpartner')) {
        var html = AnyBalance.requestPost(baseurl + 'Order/GetOrdersHistory', JSON.stringify({
            "CountToSkip": 0,
            "CountToTake": 18,
            "Statuses": [
                "Cancelled",
                "Processing",
                "DeliveryWaiting",
                "Delivery",
                "Delivered",
                "NotDelivered"
            ]
        }), g_apiHeaders);
	    AnyBalance.trace(html);
			
	    json = getJson(html);
			
        var orders = json.Orders;
	    if(orders && orders.length > 0){
	    	AnyBalance.trace('Найдено заказов: ' + orders.length);
			var ord = orders[0];
			getParam(ord.Id, result, 'lastordernum');
			getParam(ord.TotalCost, result, 'lastordersum', null, null, parseBalance);
	    	getParam(ord.InsertedDate.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'lastorderdate', null, null, parseDate);
			getParam(g_statuses[ord.Status]||ord.Status, result, 'lastorderstatus');
	    	getParam(ord.PartnerName, result, 'lastorderpartner');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему заказу');
 	    }
    }
	
	if(AnyBalance.isAvailable('messages')) {
		var html = AnyBalance.requestGet(baseurl + 'Message/GetStatistics', g_apiHeaders);
	    AnyBalance.trace(html);
			
	    json = getJson(html);
		
		getParam(json.UnreadThreadsCount, result, 'messages', null, null, parseBalance);
    }
    
	AnyBalance.setResult(result);
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://new.multibonus.ru';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html)||AnyBalance.getLastStatusCode()==403) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            userAgent: g_headers["User-Agent"],
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico)/.toString(),
                action: 'abort',
            }, {
                url: /.*/.toString(),
                action: 'request',
            }],
            additionalRequestHeaders: {
                headers: headers
            }
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

        if(/__qrator/.test(html)||AnyBalance.getLastStatusCode()==403)
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");

        AnyBalance.saveCookies();
    	AnyBalance.saveData();

    }

    return html;
}
