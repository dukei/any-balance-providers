
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://spasibosberbank.ru';
var g_baseurlAuth = 'https://id.sber.ru';

function generateUUID(){
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.token);
	AnyBalance.setData('refreshToken', json.refreshToken);
    AnyBalance.setData('expiryTime', json.expiryTime);
	AnyBalance.setData('cId', json.cid);
	AnyBalance.saveData();
}

function loginPure(){
	var prefs = AnyBalance.getPreferences();
	
	html = AnyBalance.requestGet(g_baseurl + '/login', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	html = AnyBalance.requestPost(g_baseurl + '/api/online/auth/guest', null, addHeaders({
		Authorization: 'Bearer',
		Referer: g_baseurl + '/login'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var token = json.data.token;
	
	html = AnyBalance.requestGet(g_baseurl + '/api/online/authorization/config', addHeaders({
		Authorization: 'Bearer ' +  token,
		Referer: g_baseurl + '/login'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var sberIdClientId, clientType, redirectUri, scope, state, nonce, responseType;
	
	if(json.data && json.data.sberID){
		var sberID = json.data.sberID;
	    sberIdClientId = sberID.clientID;
		clientType = sberID.clientType;
		redirectUri = sberID.redirectUri;
	    scope = sberID.scope;
	    state = sberID.state;
	    nonce = sberID.nonce;
	    responseType = sberID.responseType;
	}else{
		throw new AnyBalance.Error('Не удалось получить параметры авторизации. Сайт изменен?');
	}
	
	var logUId = generateUUID();
	
	var devicePrint = 'version=1.7.3&pm_br=Chrome&pm_brmjv=126&iframed=0&intip=&pm_expt=&pm_fpacn=Mozilla&pm_fpan=Netscape&pm_fpasw=internal-pdf-viewer|internal-pdf-viewer|internal-pdf-viewer|internal-pdf-viewer|internal-pdf-viewer&pm_fpco=1&pm_fpjv=0&pm_fpln=lang=ru-RU|syslang=|userlang=&pm_fpol=true&pm_fposp=&pm_fpsaw=1600&pm_fpsbd=&pm_fpsc=24|1600|900|870&pm_fpsdx=&pm_fpsdy=&pm_fpslx=&pm_fpsly=&pm_fpspd=24&pm_fpsui=&pm_fpsw=&pm_fptz=3&pm_fpua=mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/126.0.0.0 safari/537.36|5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36|Win32&pm_fpup=&pm_inpt=&pm_os=Windows&adsblock=0=false|1=false|2=false|3=false|4=false&audio=baseLatency=0.01|outputLatency=0|sampleRate=48000|state=suspended|maxChannelCount=2|numberOfInputs=1|numberOfOutputs=1|channelCount=2|channelCountMode=max|channelInterpretation=speakers|fftSize=2048|frequencyBinCount=1024|minDecibels=-100|maxDecibels=-30|smoothingTimeConstant=0.8&pm_fpsfse=true&webgl=ver=webgl2|vendor=Google Inc. (Intel)|render=ANGLE (Intel, Intel(R) HD Graphics 4000 (0x00000166) Direct3D11 vs_5_0 ps_5_0, D3D11)';
    
	html = AnyBalance.requestGet(g_baseurlAuth + '/CSAFront/oidc/authorize.do?oidcReferrer=https%3A%2F%2Fspasibosberbank.ru&channel=browser&logUid=' + logUId + '&response_type=' + responseType + '&client_type=' + clientType + '&redirect_uri=' + redirectUri + '&scope=' + encodeURIComponent(scope) + '&client_id=' + sberIdClientId + '&state=' + state + '&nonce=' + nonce + '&personalization=false&display=page', addHeaders({
		Referer: g_baseurl + "/"
	}));
	
	var ref = AnyBalance.getLastUrl();
	
	html = AnyBalance.requestPost(g_baseurlAuth + '/CSAFront/api/init?response_type=' + responseType + '&client_type=' + clientType + '&redirect_uri=' + redirectUri + '&scope=' + encodeURIComponent(scope) + '&client_id=' + sberIdClientId + '&state=' + state + '&nonce=' + nonce + '&personalization=false&display=page', JSON.stringify({
        "oidcReferrer": g_baseurl,
        "rsaData": {
            "deviceprint": devicePrint
        },
        "browser": "Chrome",
        "os": "windows",
        "osVersion": "NT 10.0"
    }), addHeaders({
		"Content-Type": "application/json",
		"Origin": g_baseurlAuth,
		"Process-Id": logUId,
		"Referer": ref,
		"X-Subject": sberIdClientId,
        "X-Xsrf-Token": ""
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(!json.authOperationId){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить идентификатор операции. Сайт изменен?');
	}
	
	var authOperationId = json.authOperationId;
	
	html = AnyBalance.requestPost(g_baseurlAuth + '/api/auth/phone/sms', JSON.stringify({
        "phone": "7" + prefs.login,
        "authOperationId": authOperationId,
        "authenticator": "SMS"
    }), addHeaders({
		"Content-Type": "application/json",
		"Origin": g_baseurlAuth,
		"Process-Id": logUId,
		"Referer": ref,
		"X-Subject": sberIdClientId,
        "X-Xsrf-Token": "undefined"
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(!json.authOperationId){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось отправить код подтверждения на указанный номер. Сайт изменен?');
	}
	
	var authOperationId = json.authOperationId;
	
	var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения из SMS, высланного на номер ' + formattedLogin, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(g_baseurlAuth + '/api/auth/phone/sms/code', JSON.stringify({
        "authOperationId": authOperationId,
		"code": code,
        "rememberMe": true
    }), addHeaders({
		"Content-Type": "application/json",
		"Origin": g_baseurlAuth,
		"Process-Id": logUId,
		"Referer": ref,
		"X-Subject": sberIdClientId,
        "X-Xsrf-Token": "undefined"
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.authenticators && json.authenticators.length && json.authenticators.length > 0){
		AnyBalance.trace('Найдено способов подтверждения: ' + json.authenticators.length);
		
		var authenticatorType = '';
		
		for(var i=0; i<json.authenticators.length; ++i){
	    	var authenticator = json.authenticators[i];
			
			if(authenticator == 'EMAIL'){
				AnyBalance.trace('Используем подтверждение через E-mail');
				authenticatorType = authenticator;
				
				break;
			}else{
				AnyBalance.trace('Неизвестный способ подтверждения: ' + authenticator);
			}
		}
		
		if(!authenticatorType)
			throw new AnyBalance.Error('Не удалось найти доступный способ подтверждения входа. Сайт изменен?');
		
    }else{
		throw new AnyBalance.Error('Не удалось выбрать способ подтверждения входа. Сайт изменен?');
	}
	
	html = AnyBalance.requestPost(g_baseurlAuth + '/CSAFront/api/auth/email', JSON.stringify({
        "authOperationId": authOperationId,
		"operationType": "AUTH"
    }), addHeaders({
		"Content-Type": "application/json",
		"Origin": g_baseurlAuth,
		"Process-Id": logUId,
		"Referer": ref,
		"X-Subject": sberIdClientId,
        "X-Xsrf-Token": "undefined"
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(!json.email){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось отправить код подтверждения на указанный адрес. Сайт изменен?');
	}
	
	var codeOtp = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения из письма, отправленного по адресу ' + json.email.toLowerCase(), null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(g_baseurlAuth + '/CSAFront/api/auth/email/code', JSON.stringify({
        "authOperationId": authOperationId,
		"code": codeOtp,
        "rememberMe": true
    }), addHeaders({
		"Content-Type": "application/json",
		"Origin": g_baseurlAuth,
		"Process-Id": logUId,
		"Referer": ref,
		"X-Subject": sberIdClientId,
        "X-Xsrf-Token": "undefined"
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.consent && json.consent.agreementActionText)
		throw new AnyBalance.Error('Сайт требует подтвердить "' + json.consent.agreementCharacter + '". Пожалуйста, перейдите на страницу авторизации ' + g_baseurl + 'login  через браузер и выполните все необходимые действия', null, true);
    
	if(!json.redirectUri || json.error){
		var error = (json.notification && json.notification.description) || json.error.description;
		if(error){
			AnyBalance.trace(html);
		    throw new AnyBalance.Error(error, null, /user|pass|Номер|код/i.test(error));
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
    
	var redirectUri = json.redirectUri;
	
	html = AnyBalance.requestGet(redirectUri, addHeaders({"Referer": ref}));
	
	var authCode = getParam(AnyBalance.getLastUrl(), /code=([\s\S]*?)(?:&|$)/i, replaceHtmlEntities);
	
	if(!authCode){ // Приходится получать код из url
		AnyBalance.trace('AnyBalance.getLastUrl(): ' + AnyBalance.getLastUrl());
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}
	
	if(!token){ // Если токен на главной не нашли, получаем его из куки "authData"
	    var authDataCookie = decodeURIComponent(AnyBalance.getCookie("authData"));
	    var authData = getJson(authDataCookie);
	    token = authData.token;
	}
	
	html = AnyBalance.requestPost(g_baseurl + '/api/online/registration/sberId?code=' + authCode, JSON.stringify({}), addHeaders({
		"Authorization": 'Bearer ' + token,
		"Content-Type": "application/json",
		"Origin": g_baseurl,
		"Referer": AnyBalance.getLastUrl()
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

	json = json.data.token;
	
	saveTokens(json);
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
}

function loginAccessToken(){
	var accessToken = AnyBalance.getData('accessToken');
	var cId = AnyBalance.getData('cId');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var html = AnyBalance.requestGet(g_baseurl + '/api/online/personal/me', addHeaders({
			Authorization: 'Bearer ' + accessToken,
			Cid: cId,
			Referer: g_baseurl + "/"
		}));
		if(AnyBalance.getLastStatusCode() >= 500){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
        }
	    var json = getJson(html);
		if(json.error){
			AnyBalance.trace(json.error.messages[0]);
		    return false;
		}else{
		    AnyBalance.trace('Успешно вошли по accessToken');
		    return true;
		}
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){
	var accessToken = AnyBalance.getData('accessToken');
	var refreshToken = AnyBalance.getData('refreshToken');
	var cId = AnyBalance.getData('cId');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var html = AnyBalance.requestPost(g_baseurl + '/api/online/auth/refresh', JSON.stringify({
			"refreshToken": refreshToken
		}), addHeaders({
			Authorization: 'Bearer ' + accessToken,
			Cid: cId,
			"Content-Type": "application/json",
			Origin: g_baseurl,
			Referer: g_baseurl + "/"
		}));
		if(AnyBalance.getLastStatusCode() >= 500){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
        }
	    var json = getJson(html);
		if(json.error){
			AnyBalance.trace(json.error.messages[0]);
			saveTokens({});
		    return false;
		}else{
		    AnyBalance.trace('Успешно вошли по refreshToken');
			json = json.data;
		    saveTokens(json);
		    return true;
		}
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
		saveTokens({});
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('accessToken')){
		AnyBalance.trace('Токен не сохранен. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('accessToken') && (AnyBalance.getData('login') !== prefs.login)){
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

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/(^\d{10}$|@)/, 'Введите номер телефона (10 цифр без пробелов и разделителей)!');

	login();

	var result = {success: true};

	g_headers.Authorization = 'Bearer ' + AnyBalance.getData('accessToken');
	g_headers.Cid = AnyBalance.getData('cId');
	
	var html = AnyBalance.requestGet(g_baseurl + '/api/online/personal/me', addHeaders({Referer: g_baseurl + "/"}));
	var json = getJson(html);
	AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	
	var dt = new Date();
	var dte = new Date(dt.getFullYear(), dt.getMonth()+1, 0);
	var dts = n2(dte.getDate()) + '.' + n2(dte.getMonth()+1) + '.' + dte.getFullYear();
	var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};
	
	var endDate = getParam(dts, result, 'leveltill', null, null, parseDate);
	if(AnyBalance.isAvailable('leveldays')){
		var days = Math.ceil((endDate - (new Date().getTime())) / 86400 / 1000);
		if (days >= 0){
			result.leveldays = days;
		}else{
			AnyBalance.trace('Дата окончания срока действия категорий уже наступила');
			result.leveldays = 0;
		}
	}
	
	if(json.data){
		if(json.data.loyaltySystem){
	        getParam(json.data.loyaltySystem.balance, result, 'balance', null, null, parseBalance);
	        getParam(json.data.loyaltySystem.miles, result, 'miles', null, null, parseBalance);
			if(json.data.loyaltySystem.bon_to_annulment && json.data.loyaltySystem.bon_to_annulment.length > 0){
	            getParam(json.data.loyaltySystem.bon_to_annulment.value, result, 'annul', null, null, parseBalance);
	            getParam(json.data.loyaltySystem.bon_to_annulment.date, result, 'annuldate', null, null, parseDate);
	        }
		}
	    getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'level');
	    getParam(monthes[dt.getMonth()], result, '__tariff');
	    getParam(json.data.email, result, 'email');
	    if(json.data.personal.phone){
	        getParam(json.data.personal.phone.replace(/.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'), result, 'phone');
	    }
	}else{
		AnyBalance.trace('Не удалось найти информацию по профилю');
	}
	
	if(AnyBalance.isAvailable('categories')){
	    var html = AnyBalance.requestGet(g_baseurl + '/api/online/loyalty/v1/privileges/main', addHeaders({Referer: g_baseurl + "/lk_categories"}));
	    var json = getJson(html);
	    AnyBalance.trace('Категории: ' + JSON.stringify(json));
		
	    if(json.data && json.data.items && json.data.items.length > 0){
			for(var i=0; i<json.data.items.length; ++i){
			    var item = json.data.items[i];
			    
			    if(item.blockType !== 'CurrentPrivileges'){ // Пропускаем всё, что не связано с текущими категориями
			        continue;
			    }else{
		            AnyBalance.trace('Найдено категорий: ' + item.contentItems.length);
		            if(item.contentItems && item.contentItems.length > 0){
					    for(var j=0; j<item.contentItems.length; ++j){
	                        var category = item.contentItems[j];
                            
			                sumParam(capitalizeFirstLetter(category.title.replace(/^[\s\S]*?%\s*/i, '').replace(/\s$/g, '')) 
			                + ': ' + category.title.replace(/%[\s\S]*?$/i, '').replace(/\s$/g, '') + '%', result, 'categories', null, null, null, create_aggregate_join(',<br> '));
			            }
						
						result.__tariff += ' | Категории: ' + item.contentItems.length;
					}else{
						result.categories = 'Категории не выбраны';
						result.__tariff += ' | ' + result.categories;
					}
					
					break;
				}
		    }
	    }else{
		    AnyBalance.trace('Не удалось найти информацию по категориям');
		    result.categories = 'Нет данных';
	    }
	}
/*	Заготовка под заказы
	if(AnyBalance.isAvailable(['lastordertype', 'lastorderdate', 'lastorderrubsum', 'lastordersum', 'lastordercard', 'lastorderdesc'])){
	    var html = AnyBalance.requestGet(g_baseurl + '/api/online/v1/orders?limit=10&offset=0', addHeaders({Referer: g_baseurl + "/my-orders"}));
	    var json = getJson(html);
	    AnyBalance.trace('Заказы: ' + JSON.stringify(json));
	    
	    if(json.data && json.data.items && json.data.items.length){
		    AnyBalance.trace('Найдено заказов: ' + json.data.items.length);
		    for(var i=json.data.items.length-1; i>=0; i--){
	    	    var order = json.data.items[i];
			    
			    for(var j=0; j<order.promotions.length; ++j){
	                var promotion = order.promotions[j];
					
			        sumParam(promotion.name, result, 'lastordertype', null, null, null, create_aggregate_join(',\n '));
		        }
                
			    getParam(order.orderationDate, result, 'lastorderdate', null, null, parseDate);
			    getParam(-(order.amount), result, 'lastorderrubsum', null, null, parseBalance);
	            getParam(order.bonusBalanceChange, result, 'lastordersum', null, null, parseBalance);
			    getParam(order.cardName + ' (' + order.cardLastDigits + ')', result, 'lastordercard');
	            getParam(order.partnerName, result, 'lastorderdesc');
			    
			    break;
	        }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию о последнем заказе');
	    }
	}
*/	
	if(AnyBalance.isAvailable(['lastopertype', 'lastoperdate', 'lastoperrubsum', 'lastopersum', 'lastopercard', 'lastoperdesc'])){
	    var html = AnyBalance.requestGet(g_baseurl + '/api/online/personal/loyalitySystem/transactions?page=1&cnt=100', addHeaders({Referer: g_baseurl + "/lk_history"}));
	    var json = getJson(html);
	    AnyBalance.trace('История операций: ' + JSON.stringify(json));
	    
	    if(json.data && json.data.transactions && json.data.transactions.length){
		    AnyBalance.trace('Найдено операций: ' + json.data.transactions.length);
		    for(var i=json.data.transactions.length-1; i>=0; i--){
	    	    var transaction = json.data.transactions[i];
			    
			    for(var j=0; j<transaction.promotions.length; ++j){
	                var promotion = transaction.promotions[j];
					
			        sumParam(promotion.name, result, 'lastopertype', null, null, null, create_aggregate_join(',\n '));
		        }
                
			    getParam(transaction.operationDate, result, 'lastoperdate', null, null, parseDate);
			    getParam(-(transaction.amount), result, 'lastoperrubsum', null, null, parseBalance);
	            getParam(transaction.bonusBalanceChange, result, 'lastopersum', null, null, parseBalance);
			    getParam(transaction.cardName + ' (' + transaction.cardLastDigits + ')', result, 'lastopercard');
	            getParam(transaction.partnerName, result, 'lastoperdesc');
			    
			    break;
	        }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию о последней операции');
	    }
	}

	AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
