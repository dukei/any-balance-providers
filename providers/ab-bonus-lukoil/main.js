/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
	'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
};

var g_status = {
	active: 'Активна',
	inactive: 'Неактивна',
	blocked: 'Заблокирована',
	undefined: ''
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.licard.com/';
//  var baseurlFizik = 'https://club-lukoil.ru/';
   	checkEmpty(prefs.login, 'Введите номер карты!');
   	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
    
	var result = {success: true};
	
    if (prefs.type == 'likard') {
//		var html = AnyBalance.requestGet(baseurl + 'ru/login', g_headers);
//        AnyBalance.setCookie('my.licard.com', 'ZDEDebuggerPresent', 'php,phtml,php3');
//		AnyBalance.setCookie('my.licard.com', 'geobase', 'a%3A0%3A%7B%7D');
//		AnyBalance.setCookie('my.licard.com', 'rerf', 'AAAAAGM+A1RLe+XlA3UYAg==');
		AnyBalance.setCookie('my.licard.com', 'ipp_uid', '1665008468312/5V79WWhMTvxKD2lj/hJl+7tJ/zWo+SIhqWdTRbA==');
		AnyBalance.setCookie('my.licard.com', 'ipp_key', 'v1665008468313/v33947245bb5ad87a72e273/V1w1cIeNRG8lGz860iAsDg==');
		
//		ipp_key=v1665008468313/v33947245bb5ad87a72e273/V1w1cIeNRG8lGz860iAsDg==;
//		ipp_key=v1665008468313/v33947245bb5ad87a72e273/V1w1cIeNRG8lGz860iAsDg==;
		
		var html = AnyBalance.requestGet('https://my.licard.com/ru/login', g_headers);
		AnyBalance.trace('html 0: ' + html);//////////////////////////////////////////////////////////////////////////

		var params = [];

		var captcha = getParam(html, null, null, /<img[^>]+src="\/([^"]*)"[^>]*class="captcha-pic/i);
		if(captcha){
			AnyBalance.trace('captcha: ' + captcha);//////////////////////////////////////////////////////////////////////////
			var img = AnyBalance.requestGet(baseurl + captcha, addHeaders({Referer:baseurl + 'ru/login'}));
			captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: 'number'});
			params.push(['keystring', captcha]);
		}
		
		params = params.concat([
			['login', prefs.login],
			['pass' , prefs.password],
			['submit', 'Войти'],
		]);
		
		try {
			html = AnyBalance.requestPost(baseurl + 'ru/login', params, addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		} catch(e) {
			html = AnyBalance.requestGet(baseurl + 'ru', addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		}
        //получим id пользователя
        var usedId = /\/([\s\S]{1,15})\/client/i.exec(html);
        if (!usedId){
        	var error = getParam(html, null, null, /<div[^>]+common-errors[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        	if(error)
        		throw new AnyBalance.Error(error, false, /Информация о пользователе отсутствует|пароль/i.test(error));
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
        getParam(prefs.login, result, 'cardnum');
        getParam(html, result, 'balance', /Баланс[\s\S]*?>[\s\S]*?>([\s\S]*?)<\/b/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'last_payment', /Последний платёж[\s\S]*?payments">([\s\S]*?)<\/a/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'name', /class="value user-name">\s*<b>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
        getParam(html, result, 'status', /<th[^>]*>\s*Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
/*    } else if(prefs.type == 'clubby'){
    	checkEmpty(/^\d{18,19}$/.test(prefs.login), 'Номер карты введен неверно!');

		if(prefs.type == 'clubby')
			baseurlFizik = baseurlFizik.replace(/\.ru/i, '.by');
		
        var html = AnyBalance.requestGet(baseurlFizik + 'login', g_headers);
		
        html = AnyBalance.requestPost(baseurlFizik + 'login', {
            username: prefs.login,
            password: prefs.password,
        }, g_headers);
		
        if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, [/<p[^>]+class="err"[^>]*>([\s\S]*?)<\/p>/i, /class="error">([\s\S]*?)<\//i], replaceTagsAndSpaces);
            if (error)
				throw new AnyBalance.Error(error, false, /Неверный номер карты или пароль/i.test(error));
			
			AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
		
        getParam(html, result, 'balance', /Количество&nbsp;баллов(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cardnum', /cardNumber"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, null);
		getParam(html, result, 'name', /"user-FIO"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
		getParam(html, result, 'phonenumber', /"userPhoneTableCell"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
		
        //getParam(html, result, '__tariff', /<li><span>Ваш статус в Программе:<\/span>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, null);
        //getParam(html, result, 'region', /Регион Программы:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
*/  }else{
    	mainPhysicNew(result);
    }
	
    AnyBalance.setResult(result);
}

function callApi(verb, params){
	var prefs = AnyBalance.getPreferences();
	
//	if(prefs.type == 'club'){
//      var baseurl = 'https://customer.licard.ru/';
//	}else if(prefs.type == 'clubby'){ // Сайт lk.club-lukoil.by идентичен customer.licard.ru, но имеет защиту md5cycle, поэтому перенаправляем на customer.licard.ru
//		var baseurl = 'https://lk.club-lukoil.by/';
//  }
	
	var baseurl = 'https://customer.licard.ru/';
    AnyBalance.trace('Запрос: ' + verb);
	var html = AnyBalance.requestPost(baseurl + 'api/v10/' + verb, JSON.stringify(params), addHeaders({
    	'Accept': 'application/json, text/plain, */*',
    	'X-Api-Token': 'mcHySTn5vmPvMLWrYMfG3xgC9rV2moJ6',
    	'Content-Type': 'application/json;charset=UTF-8',
    	Origin: baseurl.replace(/\/$/g, ''),
    	Referer: baseurl
    }));
    var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
   	var errors = [];
    if(json.errorCode){
    	var error = json.errorMessage;
    	throw new AnyBalance.Error(error, null, /Логин|не найден|парол|недейств/i.test(error));
    }
    	
    return json;
}

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function login(prefs){
	var prefs = AnyBalance.getPreferences();
	
	var json = callApi('user/login', {"appVersion":1,"osVersion":'win32', platform: 'web'});
    var sessionId = json.result.sessionId;

    var json = callApi('card/connect', {"cardNumber":prefs.login,"password":prefs.password, sessionId: sessionId});
    var cardId = json.result.cardShortInfo.id;
	
	AnyBalance.setData(prefs.login + 'sessionId', sessionId);
	AnyBalance.setData(prefs.login + 'cardId', cardId);
    AnyBalance.saveCookies();
    AnyBalance.saveData();
}

function mainPhysicNew(result){
    var prefs = AnyBalance.getPreferences();
	
	var sessionId = AnyBalance.getData(prefs.login + 'sessionId');
	var cardId = AnyBalance.getData(prefs.login + 'cardId');
    if (sessionId && cardId) {
    	AnyBalance.trace('Сессия сохранена. Проверяем...');
		AnyBalance.restoreCookies();
		
		var json = callApi('card/list', {"sessionId":sessionId});
        if (json.result.cards.length == 0){
			AnyBalance.trace('Сессия устарела. Будем логиниться заново...');
			clearAllCookies();
			login(prefs);
			var sessionId = AnyBalance.getData(prefs.login + 'sessionId');
			var cardId = AnyBalance.getData(prefs.login + 'cardId');
			var json = callApi('card/list', {"sessionId":sessionId});
		}
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		login(prefs);
		var sessionId = AnyBalance.getData(prefs.login + 'sessionId');
		var cardId = AnyBalance.getData(prefs.login + 'cardId');
		var json = callApi('card/list', {"sessionId":sessionId});
	}
    
    var aggregate_join_space = create_aggregate_join(' ');
	
	json = json.result.cards[0];
    
    getParam(json.balance, result, 'balance', null, null, parseBalance);
	getParam(g_status[json.cardStatus]||json.cardStatus, result, 'status');
	if(json.cardNumber)
	    getParam(json.cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(.*)/, '$1 $2 $3 $4 $5'), result, 'cardnum');

    getParam(json.cardLevel.description, result, '__tariff');
	getParam(json.cardLevel.description, result, 'level');
	
	if(AnyBalance.isAvailable('expiration_date')){
	    json = callApi('card/details/info', {"cardId":cardId, sessionId: sessionId});
		
		if(json.result.periodExpirationDate)
		    getParam(json.result.periodExpirationDate.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1'), result, 'expiration_date', null, null, parseDate);
	}

    if(AnyBalance.isAvailable('name', 'phonenumber')){
	    json = callApi('card/info', {"cardId":cardId, sessionId: sessionId});
		
		sumParam(json.result.lastName, result, 'name', null, null, capitalFirstLetters, aggregate_join_space);
		sumParam(json.result.firstName, result, 'name', null, null, capitalFirstLetters, aggregate_join_space);
		sumParam(json.result.middleName, result, 'name', null, null, capitalFirstLetters, aggregate_join_space);
		
		var phoneNumber = json.result.phoneNumber;
		if(/^\s*\+3/i.test(phoneNumber) || /^\d{12}$/.test(phoneNumber)){
	    	var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];
	    }else{
	    	var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];
	    }
		getParam(phoneNumber, result, 'phonenumber', null, replaceNumber);
    }
	
    if(AnyBalance.isAvailable(['last_payment', 'last_payment_date', 'last_payment_points_plus', 'last_payment_points_minus', 'last_payment_place'])){
		
		var dt = new Date();
        var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, dt.getDate());
        var dts = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()) + 'T' + dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getSeconds() + 'Z'; // 2022-07-05T19:44:07Z
        var dtPrevs = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate()) + 'T' + dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getSeconds() + 'Z'; // 2022-10-05T19:44:07Z
		
		json = callApi('card/transactions/list', {
            "cardId": cardId,
            "sessionId": sessionId,
            "page": 1,
            "limit": 100,
            "timePeriod": {
                "startDate": dtPrevs,
                "endDate": dts
            }
        });
		
		if(json.result.transactions && json.result.transactions.length > 0){
			AnyBalance.trace('Найдено платежей: ' + json.result.transactions.length);
			for(var i = 0; i < json.result.transactions.length; i++) {
				var info = json.result.transactions[0];
				
				getParam(info.financialInfo.paidTotal, result, 'last_payment', null, null, parseBalance);
				getParam(info.date, result, 'last_payment_date', null, null, parseDateISO);
				getParam(info.operationPoints, result, 'last_payment_points_plus', null, null, parseBalance);
				getParam(info.financialInfo.paidByPoints, result, 'last_payment_points_minus', null, null, parseBalance);
				getParam(info.financialInfo.stationNumber + ', ' + info.financialInfo.stationAddress, result, 'last_payment_place');
			}
		}else{
			AnyBalance.trace('Не удалось найти последний платеж');
		}
    }
}
