/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
//	'Accept-Language': 'en-US,en;q=0.9',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate, br',
	'sec-ch-ua': '"Chromium";v="119", "Not?A_Brand";v="24"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"Windows"',
//	'Sec-Fetch-Site': 'none',
//	'Sec-Fetch-Mode': 'navigate',
//	'Sec-Fetch-Dest': 'document',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

var baseurl = 'https://www.sportmaster.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function callApi(action, params, method){
	var prefs = AnyBalance.getPreferences();
	
	var headers = g_headers;
	
	headers['Accept'] = 'application/json, text/plain, */*';
	headers['Referer'] = baseurl + '/profile/personal/';
	headers['X-Sm-Accept-Language'] = 'ru-RU';

	if(params)
		headers['Content-Type'] = 'application/json';
	
	AnyBalance.trace('Запрос: ' + action);
	var html = AnyBalance.requestPost(baseurl + '/web-api/v1/' + action, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method || 'GET'});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	
	if(json.reason || json.errorCode || json.error){
		var error = json.reason || json.errorCode || json.message;
      	if(error){
			if(/PHONE|NUMBER/i.test(error)){
       	        throw new AnyBalance.Error('Неверный номер телефона!', null, true);
			}else if(/CODE/i.test(error)){
       	        throw new AnyBalance.Error('Неверный код подтверждения!', null, true);
			}else if(/101/i.test(error)){
       	        throw new AnyBalance.Error('Ошибка запроса. Попробуйте еще раз позже');
			}else if(/FLOW/i.test(error)){
       	        throw new AnyBalance.Error('Ошибка запроса. Сайт изменен?');
			}
			
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error, null, /телефон|код|incorrect/i.test(error));	
      	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
		
	return json;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}
	
	if(!g_savedData)
		g_savedData = new SavedData('sportmaster', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	loadProtectedPage("https://www.sportmaster.ru/oferta/", g_headers);
	
	var html = AnyBalance.requestGet(baseurl + '/profile/personal/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 403){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(!/profile__logout/i.test(html) || AnyBalance.getLastStatusCode() == 401){
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookiesExceptProtection();
    	html = login();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	if(AnyBalance.isAvailable('balance', 'cashback', 'promo', 'currlevel', 'cashlevel', '__tariff', 'cardnum', 'buysum', 'nexlevel', 'nextlevel', 'cashbacktillsum', 'cashbacktilldate', 'promotillsum', 'promotilldate')){
		var json = callApi('profiles/current/bonuses/');
		
		var g_status = {STANDARD: 'Стандартный', SILVER: 'Серебряный', GOLD: 'Золотой', undefined: ''};

		getParam(json.details.total, result, 'balance', null, null, parseBalance);
        getParam(json.details.cashback.amount, result, 'cashback', null, null, parseBalance);
		getParam(json.details.promo.amount, result, 'promo', null, null, parseBalance);
		var curLevel = getParam(g_status[json.currentLevel]||json.currentLevel, result, 'currlevel');
		var cashLevel = getParam(json.cashbackLevel, result, 'cashlevel');
		result.__tariff = curLevel + ' | ' + cashLevel + '%';
	    getParam(json.cardNumber, result, 'cardnum');
		
		getParam(json.buySum, result, 'buysum', null, null, parseBalance);
		
		if(json.nextLevel){
		    getParam(g_status[json.nextLevel]||json.nextLevel, result, 'nexlevel');
		}else{
			result.nexlevel = 'Достигнут';
		}
		if(json.toNextLevelSum){
		    getParam(json.toNextLevelSum, result, 'nextlevel', null, null, parseBalance);
		}
		
		if (json.details.cashback.dateEnd){
		    getParam(json.details.cashback.amountToBeExpired, result, 'cashbacktillsum', null, null, parseBalance);
		    getParam(json.details.cashback.dateEnd.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'cashbacktilldate', null, null, parseDate);
		}
		
		if (json.details.promo.dateEnd){
		    getParam(json.details.promo.amountToBeExpired, result, 'promotillsum', null, null, parseBalance);
		    getParam(json.details.promo.dateEnd.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'promotilldate', null, null, parseDate);
		}
	}
    
    if(AnyBalance.isAvailable('fio', 'email', 'phone')){
		var json = callApi('profiles/current/');
		
        var fio = json.firstName;
	    if(json.lastName)
	    	fio += ' ' + json.lastName;
	    getParam(fio, result, 'fio');
		getParam(json.email, result, 'email');
	    getParam(json.phone, result, 'phone', null, replaceNumber);
	}
	
	if(AnyBalance.isAvailable('favorite')){
		var json = callApi('wishlist/products/');
		
		getParam(json.items && json.items.length, result, 'favorite', null, null, parseBalance);
	}
/*	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_desc')){
	    var dt = new Date();
		dtBegin = dt.getFullYear() - 1 + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + (dt.getDate())).slice(-2);
		dtEnd = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + (dt.getDate())).slice(-2);
		
		var json = callApi('api/v1/bonus/history?dateBegin=' + dtBegin + '&dateEnd=' + dtEnd);
		json = json.list;
		
        if(json.length){
        	var t = json[0];
        	getParam(t.date.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'last_oper_date', null, null, parseDate);
        	getParam(t.summa, result, 'last_oper_sum', null, null, parseBalance);
        	getParam(t.transDesc, result, 'last_oper_desc');
        }else{
			AnyBalance.trace('Последняя операция не найдена');
		}
	}
*/	
    if(AnyBalance.isAvailable('last_order_date', 'last_order_number', 'last_order_status', 'last_order_sum')){
        var json = callApi('orders/?page=1');
		
        if(json.orders && json.orders.length > 0){
        	var o = json.orders[0];
        	getParam(o.date.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'last_order_date', null, null, parseDate);
        	getParam(o.number, result, 'last_order_number');
        	getParam(o.totalCost, result, 'last_order_sum', null, null, parseBalance);
        	getParam(o.status.sm.text, result, 'last_order_status');
        }else{
			AnyBalance.trace('Последний заказ не найден');
		}
    }
	
	if(AnyBalance.isAvailable('last_retail_date', 'last_retail_number', 'last_retail_status', 'last_retail_sum')){
        var json = callApi('orders/retails?page=1&pageSize=5');
		
        if(json.retails && json.retails.length > 0){
        	var r = json.retails[0];
        	getParam(r.date.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'last_retail_date', null, null, parseDate);
        	getParam(r.number, result, 'last_retail_number');
        	getParam(r.totalCost, result, 'last_retail_sum', null, null, parseBalance);
        	getParam(r.status.sm.text, result, 'last_retail_status');
        }else{
			AnyBalance.trace('Последняя покупка не найдена');
		}
    }

	AnyBalance.setResult(result);
}
	
function login(){
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '7$1$2$3$4');
	var formattedLoginHint = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
	
	var html = AnyBalance.requestGet(baseurl + '/login/', g_headers);
	
	var json = callApi('auth/phone/codes/', {'typeChannel': 'SMS', 'phone': formattedLogin}, 'POST');
	
	if(!json.codeLength)
       	throw new AnyBalance.Error('Не удалось отправить SMS на указанный номер. Сайт изменен?');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + formattedLoginHint, null, {inputType: 'number', time: 180000});
	
	var json = callApi('auth/phone/codes/_verify/', {'code': code, 'phone': formattedLogin}, 'POST');
	
	if(!json.step || (json.step && json.step !== 'AUTHORIZATION'))
       	throw new AnyBalance.Error('Не удалось проверить код подтверждения. Сайт изменен?');
	
	var json = callApi('auth/phone/_login/', {'login': formattedLogin}, 'POST');
	
	if(!json.ga || (json.ga && !json.ga.userId))
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	
	html = AnyBalance.requestGet(baseurl + '/profile/personal/', g_headers);
	
	g_savedData.setCookies();
	g_savedData.save();
	
	return html;
}

function loadProtectedPage(url, headers){
	var prefs = AnyBalance.getPreferences();

    if(!headers)
		headers = g_headers;

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html) || AnyBalance.getLastStatusCode() == 401) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            provider: 'sportmaster',
            //userAgent: headers["user-agent"] || headers["User-Agent"],
	    noInterception: true,
            //win: true,
	    incognito: true,
	    singlePage: true,	        
            headful: true,
            rules: [{
                url: /^data:/.toString(),
                action: 'abort',
            },{       
                accept: /^(image|css|font|script)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator\/qauth_utm_v2(?:_\w+)?\.js/.toString(),
                action: 'cache',
                valid: 3600*1000
            }, {
                url: /_qrator|oferta/.toString(),
                action: 'request',
            }, {
                url: /\.(png|jpg|ico|svg)/.toString(),
                action: 'abort',
            }, {
                url: /cdn.sportmaster.ru/.toString(),
                action: 'abort'
            }, {
		url: /.*/.toString(),
		action: 'abort'
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
        console.log(html);
        if(/__qrator|HTTP 40[31]|block-msg/.test(html)||AnyBalance.getLastStatusCode() >= 400)
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");
        AnyBalance.saveCookies();
    	AnyBalance.saveData();

    }

    return html;
}

function clearAllCookiesExceptProtection(){
	clearAllCookies(function(c){return!/qrator|UDID|SMAID/i.test(c.name)})
}
