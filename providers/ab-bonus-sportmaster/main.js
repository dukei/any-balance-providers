/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Content-Type': 'application/json;charset=UTF-8',
	'Origin': 'https://m.sportmaster.ru',
    'Referer': 'https://m.sportmaster.ru/user/session/login.do',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
};

var baseurl = "https://m.sportmaster.ru";
var g_savedData;
var replaceNumberSite = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
	var prefs = AnyBalance.getPreferences();
	
	switch(prefs.source){
	case 'app':
        var html = mainAPI(prefs);
    case 'site':
        var html = mainSite(prefs);
    case 'auto':
    default:
        try{
			var html = mainAPI(prefs);
        }catch(e){
            if(e.fatal)
                throw e;
			AnyBalance.trace('Не удалось получить данные из мобильного приложения');
		    clearAllCookies();
            var html = mainSite(prefs);
        }
        break;
	}
	
	var result = {success: true};
	
	AnyBalance.setResult(result);
}

function mainSite(){
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	g_savedData = new SavedData('sport_master_site', prefs.login_site);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем получить данные с официального сайта...');
	
	var html = AnyBalance.requestGet(baseurl + '/rest/v1/auth?__local=0', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт Спортмастер временно недоступен. Попробуйте еще раз позже');
    }
		
	var json = getJsonEval(html);
	AnyBalance.trace(JSON.stringify(json));
	
    if(json && json.anonymous != true){
		AnyBalance.trace('Похоже, мы уже залогинены на имя ' + json.name + ' ' + json.lastname + ' (' + prefs.login_site + ')');
    }else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
	}

    var result = {success: true};
	
	if (AnyBalance.isAvailable('balance', 'cardnum', 'fio', 'phone')) {
	    html = AnyBalance.requestGet(baseurl + '/rest/v1/auth?__local=0', g_headers);
		
		var json = getJsonEval(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		getParam(json.bonusAmount, result, 'balance', null, null, parseBalance);
		getParam(json.customer.cardNumber, result, 'cardnum');
		var fio = json.name; // Если пользователь не указал в профиле фамилию, значение свойства "name" имеет вид "Имя null", поэтому делаем в виде сводки
	    if (json.lastname)
	    	fio+=' '+json.lastname;
	    getParam(fio, result, 'fio');
	    getParam(json.customer.phone, result, 'phone', null, replaceNumberSite);
	}
	
	if(AnyBalance.isAvailable('__tariff', 'buysum', 'nextlevel', 'till', 'sumtill', 'cashback', 'promo')){
    	html = AnyBalance.requestGet(baseurl + '/rest/v1/auth/bonus', g_headers);
		
		var json = getJsonEval(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		getParam(json.clientInfo.curLevelName, result, '__tariff');
		getParam(json.clientInfo.buySumma, result, 'buysum', null, null, parseBalance);
		getParam(json.clientInfo.toNextLevelSumma, result, 'nextlevel', null, null, parseBalance);
        var balance = 0, minExpDate, minExpSum;
        if(json.clientInfo.bonuses){
        	var balance = json.clientInfo.bonuses.reduce(function(acc, a){
        		var dt = parseDateISO(a.dateEnd);
        		if(a.amount && (!isset(minExpDate) || minExpDate > dt)){
        			minExpDate = dt;
        			minExpSum = a.amount;
        		}
        		return acc+=a.amount;
        	}, 0);

			getParam(minExpDate, result, 'till');
			getParam(minExpSum, result, 'sumtill', null, null, parseBalance);
        }
        if(json.details){
        	var cashback=0, promo=0;
        	for(var i=0; i<json.details.length; ++i){
        		var d = json.details[i];
        		if(d.bonusTypeCode === 7)
        			cashback += d.amount;
        		if(d.bonusTypeCode === 8)
        			promo += d.amount;
        	}
			getParam(cashback, result, 'cashback', null, null, parseBalance);
			getParam(promo, result, 'promo', null, null, parseBalance);
        }
    }
	
    if (AnyBalance.isAvailable('last_order_date', 'last_order_number', 'last_order_status', 'last_order_sum')) {
	    html = AnyBalance.requestGet(baseurl + '/rest/v2/orders?page=0&size=3', g_headers);
		
		var json = getJsonEval(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if (json.orders[0]){
		    var orderData = json.orders[0];
		    getParam(orderData.createDate, result, 'last_order_date', null, null, null);
		    getParam(orderData.number, result, 'last_order_number');
		    getParam(orderData.statusTitle, result, 'last_order_status');
		    getParam(orderData.total, result, 'last_order_sum', null, null, parseBalance);
		}else{
			AnyBalance.trace('Последний заказ не найден');
		}
		
	}
	
	AnyBalance.setResult(result);
}

function loginSite(prefs){
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login_site, 'Введите логин!');
    if (/^\d+$/.test(prefs.login_site)){
	    checkEmpty(/^\d{10}$/.test(prefs.login_site), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestPost(baseurl + '/rest/v1/confirmation/captcha/login?__local=1', {type: "login", __local: 1}, g_headers);
		
	var json = getJsonEval(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.required = 'true') {
	    AnyBalance.trace('Спортмастер затребовал капчу');
	    var capKey = json.key
	    var recaptcha = solveRecaptcha('Пожалуйста, подтвердите, что Вы не робот', baseurl + '/', '6LeTH-IUAAAAAL31r4UoabGNn-9ifCS63cxzc7q3', {USERAGENT: g_headers['User-Agent']});
	}
	
	if (/^\d{10}$/.test(prefs.login_site)) {
		var login_type = 'phone';
	} else {
		var login_type = 'email';
	}
	
	var params = {
	    "captchaKey": capKey,
		"password": prefs.password,
		"reCaptchaResponse": recaptcha,
		"token": prefs.login_site,
		"type": login_type
	};
	
	AnyBalance.trace('Входим по логину ' + prefs.login_site + ' и паролю...');
	
	html = AnyBalance.requestPost(baseurl + '/rest/v1/auth', JSON.stringify(params), g_headers);
	
	var json = getJsonEval(html);
		
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error, /42/i.test(json.error) ? true : null, /телефон|парол/i.test(json.error));
	}

    if(!json){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
	}

	g_savedData.setCookies();
	g_savedData.save();
	return json;
}
