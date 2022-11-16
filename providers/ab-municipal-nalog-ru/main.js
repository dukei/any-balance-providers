/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
};

var g_type = {
	TRANSPORT: 'Транспортный налог',
	PROPERTY: 'Налог на имущество',
	LAND: 'Земельный налог',
	undefined: ''
};

var baseurl = 'https://lkfl2.nalog.ru';

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + '/lkfl/login', g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}

	login();
	
	var accessToken = AnyBalance.getData('access_token');
	
	var result = {success: true};

	result.__tariff = prefs.login;
	
	if(AnyBalance.isAvailable('enp', 'enpconfirmed', 'daysleft', 'appears')){
		html = AnyBalance.requestGet(baseurl + '/lkfl/api/v1/taxes/taxInfo', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
        
		json = getJson(html);
		AnyBalance.trace('Задолженность: ' + JSON.stringify(json));
		getParam(json.enpSum, result, 'enp', null, null, parseBalance);
		getParam(json.confirmedPaymentsSum, result, 'enpconfirmed', null, null, parseBalance);
		getParam(json.daysLeft, result, 'daysleft', null, null, parseBalance);
		getParam(json.sumToPay, result, 'arrears', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable(['appears', 'transport', 'property', 'land'])){
	    html = AnyBalance.requestGet(baseurl + '/lkfl/api/v1/taxes/cards', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
        
		json = getJson(html);
		AnyBalance.trace('Категории: ' + JSON.stringify(json));
		
		getParam(json.totalSumToPay, result, 'arrears', null, null, parseBalance);
		
		if(json.taxesGroup && json.taxesGroup.length>0){
	        for(var i=0; i<json.taxesGroup.length; ++i){
	        	var tax = json.taxesGroup[i];
	        	AnyBalance.trace('Найден налог ' + tax.taxType);
	        	if(tax.taxType === 'TRANSPORT'){
	        		getParam(tax.totalSum, result, 'transport', null, null, parseBalance);
	        	}else if(tax.taxType === 'PROPERTY'){
	        		getParam(tax.totalSum, result, 'property', null, null, parseBalance);
	        	}else if(tax.taxType === 'LAND'){
	        		getParam(tax.totalSum, result, 'land', null, null, parseBalance);
	        	}else{
	        		AnyBalance.trace('Неизвестный тип налога: ' + tax.taxType);
	        	}
	        }
	    }else{
	    	AnyBalance.trace('Не удалось получить информацию по налогам');
	    }
	}
	
	if(AnyBalance.isAvailable(['inn', 'notifications', 'email', 'fio'])){
		html = AnyBalance.requestGet(baseurl + '/lkfl/api/v1/taxpayer/info/v2', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
        
		json = getJson(html);
		AnyBalance.trace('Профиль: ' + JSON.stringify(json));
		getParam(json.inn, result, 'inn');
		getParam(json.newNotifications, result, 'notifications', null, null, parseBalance);
		getParam(json.email, result, 'email');
		getParam(json.name, result, 'fio', null, null, capitalFirstLetters);
	}
	
	if(AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastopertype', 'lastoperdesc')){
//	    var dt = new Date();
//		dtBegin = dt.getFullYear() - 1 + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + (dt.getDate())).slice(-2);
//		dtEnd = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + (dt.getDate())).slice(-2);
		
		html = AnyBalance.requestPost(baseurl + '/lkfl/api/v1/taxes/historyOperations', JSON.stringify({
            "pagination": {
                "page": 0,
                "size": 10
            },
            "filter": {
                "showCorrections": false,
                "operationType": "ALL",
                "taxCode": "ALL",
                "taxType": "ALL"
            }
		}), addHeaders({
			'Accept': 'application/json, text/plain, */*',
			'Authorization': 'Bearer ' + accessToken,
			'Content-Type': 'application/json',
			'Origin': baseurl,
			'Referer': baseurl + '/lkfl/myTaxes/operationsHistory'
		}));
	
	    json = getJson(html);
		AnyBalance.trace('Операции: ' + JSON.stringify(json));
		
        if(json.content && json.content.length>0){
        	var o = json.content[0];
        	getParam(o.operationDate.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'lastoperdate', null, null, parseDate);
        	getParam(o.sum, result, 'lastopersum', null, null, parseBalance);
        	getParam(g_type[o.taxType]||o.taxType, result, 'lastopertype');
			getParam(o.operationDescription, result, 'lastoperdesc');
        }else{
			AnyBalance.trace('Последняя операция не найдена');
		}
	}

/*	if(AnyBalance.isAvailable('overpay')){
		html = AnyBalance.requestGet(baseurl + '/lkfl/api/v1/taxpayer/overpayments', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
        
		json = getJson(html);

		var over = (json || []).reduce(function(acc, cur){ acc += cur.classifiedOverpaymentTotal; return acc }, 0);
		getParam(over, result, 'overpay');
	}*/
	
    AnyBalance.setResult(result);
}

function saveTokens(json){
	AnyBalance.setData('access_token', json.access_token);
	AnyBalance.setData('refresh_token', json.refresh_token);
	AnyBalance.setData('expires_in', json.expires_in);
	AnyBalance.setData('token_type', json.token_type);
	AnyBalance.saveData();
}

function loginPure(){
	var prefs = AnyBalance.getPreferences();
	
	clearAllCookies();
	
	var html = requestPostMultipart(baseurl + '/auth/oauth/token', {
		'username': prefs.login,
		'password': prefs.password,
		'grant_type': 'password',
		'client_id': 'taxpayer-browser',
		'client_secret': '7VIPKnZAtwQL7fmtvu2rnAHT6c34DkkG'
	}, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Origin': baseurl,
		'Referer': baseurl + '/lkfl/login',
	}));

	var json = getJson(html);

    if(json.message && (/CAPTCHA/i.test(json.message))){
		AnyBalance.trace('Сайт ФНС затребовал капчу');
		var img = AnyBalance.requestGet(baseurl + '/auth/captcha?username=' + prefs.login, addHeaders({
			'Authorization': 'Basic dGF4cGF5ZXItYnJvd3Nlcjo3VklQS25aQXR3UUw3Zm10dnUycm5BSFQ2YzM0RGtrRw==',
			'Referer': baseurl + '/lkfl/login'
		}));
		
		if(!img){
	        AnyBalance.trace(html);
	        throw new AnyBalance.Error('Не удалось найти капчу. Сайт изменен?');
	    }
		
		var captcha = AnyBalance.retrieveCode('Пожалуйста, введите цифры с картинки', img, {inputType: 'number', time: 300000});
		
		html = requestPostMultipart(baseurl + '/auth/oauth/token', {
		    'username': prefs.login,
		    'password': prefs.password,
			'captcha': captcha,
		    'grant_type': 'password',
		    'client_id': 'taxpayer-browser',
		    'client_secret': '7VIPKnZAtwQL7fmtvu2rnAHT6c34DkkG'
	    }, addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Origin': baseurl,
	    	'Referer': baseurl + '/lkfl/login',
	    }));

	    var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
		
		if(json.status){
	    	var error = json.message;
	    	if(error) {
	    		throw new AnyBalance.Error(error, null, /Incorrect CAPTCHA/i.test(error));
	    	}

	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		
    }
	
	if(!json.access_token){
		var error = json.error_description;
		if(error) {
			throw new AnyBalance.Error(error, null, /bad credentials/i.test(error));
		}

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проверьте правильность ввода логина и пароля. Также, возможно, сайт изменен');
    }
	
	saveTokens(json);
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}

function loginAccessToken(){
	var accessToken = AnyBalance.getData('access_token');
	AnyBalance.restoreCookies();
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		html = AnyBalance.requestGet(baseurl + '/lkfl/api/v1/taxes/taxInfo', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
	    var json = getJson(html);
		if (!json.sumToPay){
		    return false;
		}else{
		    AnyBalance.trace('Успешно вошли по accessToken');
		    return true;
		}
	}catch(e){
		var error = getParam(html, null, null, /<error_description[^>]*>([\s\S]*?)<\/error_description>/i, replaceTagsAndSpaces);
		AnyBalance.trace('Не удалось войти по accessToken: ' + (error || e.error_description));
		return false;
	}
}

function loginRefreshToken(){
	var refreshToken = AnyBalance.getData('refresh_token');
	AnyBalance.restoreCookies();
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var html = requestPostMultipart(baseurl + '/auth/oauth/token', {
	    	'grant_type': 'refresh_token',
	    	'client_id': 'taxpayer-browser',
	    	'client_secret': '7VIPKnZAtwQL7fmtvu2rnAHT6c34DkkG',
			'refresh_token': refreshToken,
	    }, addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Origin': baseurl,
	    	'Referer': baseurl + '/lkfl/',
	    }));
		
	    var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
		
		if (!json.access_token){
			AnyBalance.trace('Токен refreshToken не принят. Будем логиниться заново');
		    saveTokens({});
		    clearAllCookies();
		    AnyBalance.saveData();
		    return false;
		}else{
		    AnyBalance.trace('Успешно вошли по refreshToken');
		    saveTokens(json);
			AnyBalance.saveCookies();
			AnyBalance.saveData();
		    return true;
		}
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.error_description);
		saveTokens({});
		clearAllCookies();
		AnyBalance.saveData();
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('access_token')){
		AnyBalance.trace('Токен не сохранен. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('access_token') && (AnyBalance.getData('login') !== prefs.login)){
		AnyBalance.trace('Токен соответствует другому логину');
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
