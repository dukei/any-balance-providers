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
	
	html = AnyBalance.requestGet(baseurl + '/api/lkfl/api/v1/ens/general', addHeaders({
		'Authorization': 'Bearer ' + accessToken,
		'Referer': baseurl + '/lkfl/'
	}));
    
	var mainInfo = getJson(html);
	AnyBalance.trace('Сводка: ' + JSON.stringify(mainInfo));
	getParam(mainInfo.ens.balanceAmount, result, 'balance', null, null, parseBalance);
	getParam(mainInfo.ens.arrearAmount, result, 'arrears', null, null, parseBalance);
	getParam(mainInfo.ens.recommendedPaymentAmount, result, 'accruals', null, null, parseBalance);
	
	if(mainInfo.ens.accrual && mainInfo.ens.accrual.accrualNearest){
		getParam(mainInfo.ens.accrual.accrualNearest.amount, result, 'accrualnearest', null, null, parseBalance);
		getParam(mainInfo.ens.accrual.accrualNearest.date, result, 'accrualnearestdate', null, null, parseDateISO);
	}
	
	getParam((mainInfo.ens.balanceAmount && mainInfo.ens.balanceAmount > 0) ? mainInfo.ens.balanceAmount : 0, result, 'overpay', null, null, parseBalance);
	
	if(AnyBalance.isAvailable('enp', 'enpconfirmed')){
		html = AnyBalance.requestGet(baseurl + '/api/lkfl/api/v1/taxes/taxInfo', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
        
		var taxInfo = getJson(html);
		AnyBalance.trace('taxInfo: ' + JSON.stringify(taxInfo));
		getParam(taxInfo.enpSum, result, 'enp', null, null, parseBalance);
		getParam(taxInfo.confirmedPaymentsSum, result, 'enpconfirmed', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable(['accruals', 'arrears', 'transport', 'property', 'land', 'daysleft'])){
        html = AnyBalance.requestGet(baseurl + '/api/lkfl/api/v1/ens/liabilitiesMeta', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/individual/taxes'
		}));
        
		json = getJson(html);
		AnyBalance.trace('Все начисления: ' + JSON.stringify(json));
		
		var accInfo = json.accruals;
		var arrInfo = json.arrears;
		
		if(accInfo && accInfo.length>0){
	        for(var i=0; i<accInfo.length; ++i){
	        	var accrual = accInfo[i];
				sumParam(accrual.amount, result, 'accruals', null, null, parseBalance, aggregate_sum);
			}
		}else{
	    	AnyBalance.trace('Предстоящие платежи не найдены');
	    }
		
		if(arrInfo && arrInfo.length>0){
	        for(var i=0; i<arrInfo.length; ++i){
	        	var arrear = arrInfo[i];
				sumParam(arrear.amount, result, 'arrears', null, null, parseBalance, aggregate_sum);
			}
		}else{
	    	AnyBalance.trace('Задолженности не найдены');
	    }
		
		if(result.accruals && result.accruals > 0){ // Обрабатываем предстоящие платежи
			html = AnyBalance.requestPost(baseurl + '/api/lkfl/api/v1/ens/accrualsLiabilitySvnz', JSON.stringify({
                "filter": {
                    "liabilityType": "FL",
                    "sourceDocCodes": [],
                    "svnzCodes": []
                },
                "pagination": {
                    "page": 0,
                    "size": 10
                }
            }), addHeaders({
			    'Accept': 'application/json, text/plain, */*',
			    'Authorization': 'Bearer ' + accessToken,
			    'Content-Type': 'application/json',
			    'Origin': baseurl,
			    'Referer': baseurl + '/lkfl/individual/taxes'
		    }));
            
		    json = getJson(html);
		    AnyBalance.trace('Предстоящие платежи: ' + JSON.stringify(json));
		    
		    if(json.content && json.content.length>0){
				var dates = [];
				
	            for(var i=0; i<json.content.length; ++i){
	        	    var tax = json.content[i];
	        	    AnyBalance.trace('Найден налог: ' + tax.svnzInfo.title);
	        	    if(tax.svnzInfo.code == 20){ // Транспортный налог
	        		    getParam(tax.amount, result, 'transport', null, null, parseBalance);
						dates.push(getParam(tax.date, null, null, null, null, parseDateISO));
	        	    }else if(tax.svnzInfo.code == 25){ // Налог на имущество
	        		    getParam(tax.amount, result, 'property', null, null, parseBalance);
						dates.push(getParam(tax.date, null, null, null, null, parseDateISO));
	        	    }else if(tax.svnzInfo.code == 24){ // Земельный налог
	        		    getParam(tax.amount, result, 'land', null, null, parseBalance);
						dates.push(getParam(tax.date, null, null, null, null, parseDateISO));
	        	    }else{
	        		    AnyBalance.trace('Неизвестный тип налога: ' + tax.svnzInfo.title);
	        	    }
	            }
				
				var date = findEarliestDate(dates);
				
		        if(date){
	        		var days = Math.ceil((date - (new Date().getTime())) / 86400 / 1000);
	        		if(days >= 0){
	        			result.daysleft = days;
	        		}else{
	        			AnyBalance.trace('Дата уплаты налогов уже наступила');
		        		result.daysleft = 0;
		        	}
	        	}else{
 	        		AnyBalance.trace('Не удалось получить дату уплаты налогов');
 	        	}
	        }else{
	    	    AnyBalance.trace('Не удалось получить информацию о предстоящих платежах');
	        }
		}
		
		if(result.arrears && result.arrears > 0){ // Обрабатываем задолженности
			html = AnyBalance.requestPost(baseurl + '/api/lkfl/api/v1/ens/arrearsLiabilitySvnz', JSON.stringify({
            "filter": {
                "liabilityType": "FL",
                "sourceDocCodes": [],
                "svnzCodes": []
            },
            "pagination": {
                "page": 0,
                "size": 10
            }
        }), addHeaders({
			    'Accept': 'application/json, text/plain, */*',
			    'Authorization': 'Bearer ' + accessToken,
			    'Content-Type': 'application/json',
			    'Origin': baseurl,
			    'Referer': baseurl + '/lkfl/individual/taxes'
		    }));
            
		    json = getJson(html);
		    AnyBalance.trace('Задолженности: ' + JSON.stringify(json));
		    
		    if(json.content && json.content.length>0){
				var dates = [];
				
	            for(var i=0; i<json.content.length; ++i){
	        	    var tax = json.content[i];
	        	    AnyBalance.trace('Найден налог: ' + tax.svnzInfo.title);
	        	    if(tax.svnzInfo.code == 20){ // Транспортный налог
	        		    getParam(tax.amount, result, 'transport', null, null, parseBalance);
						dates.push(getParam(tax.periodYear + '-12-01', null, null, null, null, parseDateISO));
	        	    }else if(tax.svnzInfo.code == 25){ // Налог на имущество
	        		    getParam(tax.amount, result, 'property', null, null, parseBalance);
						dates.push(getParam(tax.periodYear + '-12-01', null, null, null, null, parseDateISO));
	        	    }else if(tax.svnzInfo.code == 24){ // Земельный налог
	        		    getParam(tax.amount, result, 'land', null, null, parseBalance);
						dates.push(getParam(tax.periodYear + '-12-01', null, null, null, null, parseDateISO));
	        	    }else{
	        		    AnyBalance.trace('Неизвестный тип налога: ' + tax.svnzInfo.title);
	        	    }
	            }
				
				var date = findEarliestDate(dates);
				
		        if(date){
	        		var days = Math.ceil((date - (new Date().getTime())) / 86400 / 1000);
	        		result.daysleft = days;
	        	}else{
 	        		AnyBalance.trace('Не удалось получить дату уплаты налогов');
 	        	}
	        }else{
	    	    AnyBalance.trace('Не удалось получить информацию о задолженностях');
	        }
		}
	}
	
	if(AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastopertype', 'lastoperdesc')){
		html = AnyBalance.requestPost(baseurl + '/api/lkfl/api/v1/ens/historyOperations', JSON.stringify({
            "filter": {
                "actionTypeName": "",
                "sourceDocCodes": []
            },
            "pagination": {
                "page": 0,
                "size": 10
            }
        }), addHeaders({
			'Accept': 'application/json, text/plain, */*',
			'Authorization': 'Bearer ' + accessToken,
			'Content-Type': 'application/json',
			'Origin': baseurl,
			'Referer': baseurl + '/lkfl/individual/taxes'
		}));
	
	    json = getJson(html);
		AnyBalance.trace('Операции: ' + JSON.stringify(json));
		
        if(json.content && json.content.length>0){
        	var o = json.content[0];
        	getParam(o.date, result, 'lastoperdate', null, null, parseDateISO);
        	getParam(o.amount, result, 'lastopersum', null, null, parseBalance);
        	getParam(o.svnzInfo.title, result, 'lastopertype', null, replaceTagsAndSpaces);
			getParam(o.operationDescription||o.actionTypeInfo.name, result, 'lastoperdesc', null, replaceTagsAndSpaces);
        }else{
			AnyBalance.trace('Последняя операция не найдена');
		}
	}
	
	if(AnyBalance.isAvailable(['inn', 'notifications', 'email', 'fio'])){
		html = AnyBalance.requestGet(baseurl + '/api/lkfl/api/v1/taxpayer/info/v2', addHeaders({
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

/*	if(AnyBalance.isAvailable('overpay')){
		html = AnyBalance.requestGet(baseurl + '/api/lkfl/api/v1/taxpayer/overpayments', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
        
		json = getJson(html);
		AnyBalance.trace('Переплата: ' + JSON.stringify(json));

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
	
	var html = requestPostMultipart(baseurl + '/api/auth/oauth/token', {
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
	AnyBalance.trace(JSON.stringify(json));

    if(json.message && (/CAPTCHA/i.test(json.message))){
		AnyBalance.trace('Сайт ФНС затребовал капчу');
		var img = AnyBalance.requestGet(baseurl + '/api/auth/captcha?username=' + prefs.login, addHeaders({
			'Authorization': 'Basic dGF4cGF5ZXItYnJvd3Nlcjo3VklQS25aQXR3UUw3Zm10dnUycm5BSFQ2YzM0RGtrRw==',
			'Referer': baseurl + '/lkfl/login'
		}));
		
		if(!img){
	        AnyBalance.trace(html);
	        throw new AnyBalance.Error('Не удалось найти капчу. Сайт изменен?');
	    }
		
		var captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: 'number', time: 300000});
		
		html = requestPostMultipart(baseurl + '/api/auth/oauth/token', {
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
				if(/Incorrect CAPTCHA/i.test(error)){
				    throw new AnyBalance.Error('Неверный код с картинки!', null, true);
			    }else{
			        throw new AnyBalance.Error(error, null, true);
			    }
	    	}

	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		
    }
	
	if(!json.access_token){
		var error = json.error_description;
		if(error) {
			if(/bad credentials/i.test(error)){
				throw new AnyBalance.Error('Неверный логин или пароль!', null, true);
			}else{
			    throw new AnyBalance.Error(error, null, true);
			}
		}

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
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
		var html = AnyBalance.requestGet(baseurl + '/api/lkfl/api/v1/taxes/taxInfo', addHeaders({
			'Authorization': 'Bearer ' + accessToken,
			'Referer': baseurl + '/lkfl/'
		}));
	    var json = getJson(html);
		if(!json.sumToPay){
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
		var html = requestPostMultipart(baseurl + '/api/auth/oauth/token', {
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
		
		if(!json.access_token){
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
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.error_description + '. Будем логиниться заново');
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

function findEarliestDate(dates){
    if(dates.length == 0)
		return null;
	
    var earliestDate = dates[0];
	
    for(var i=1; i<dates.length; i++){
        var currentDate = dates[i];
        if(currentDate < earliestDate){
            earliestDate = currentDate;
        }
    }
	
    return earliestDate;
}
