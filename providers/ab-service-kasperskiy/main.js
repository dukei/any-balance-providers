/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://my.kaspersky.com/';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
	    g_savedData = new SavedData('my.kaspersky', prefs.login);

	g_savedData.restoreCookies();
	
	var html = AnyBalance.requestGet(g_baseurl + 'MyLicenses', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	if(!/"myKasperskyId"/i.test(html) || /"myKasperskyId":\s*?""/i.test(html)){
        html = AnyBalance.requestGet(g_baseurl + 'api/config/common', addHeaders({
	    	'Content-Type': 'application/json',
	    	'Referer': g_baseurl,
	    	'X-Requested-With': 'XMLHttpRequest'
	    }));
	    
	    var json = getJson(html);
		
		if(json.globalSettings && json.globalSettings.xsrfToken)
	        var token = json.globalSettings.xsrfToken;
		
		if(!token){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	    }
		
		html = AnyBalance.requestPost(g_baseurl + 'SignIn/StartRestLogon', JSON.stringify({}), addHeaders({
	    	'Content-Type': 'application/json',
	    	'Referer': AnyBalance.getLastUrl(),
	    	'X-Requested-With': 'XMLHttpRequest',
            'X-Xsrf-Token': token
        }));
	
	    var json = getJson(html);
		AnyBalance.trace('StartRestLogon: ' + JSON.stringify(json));
		var nonce = json.nonce;

	    html = AnyBalance.requestPost('https://eu.uis.kaspersky.com/v3/logon/start', JSON.stringify({
            "Nonce": nonce,
			"Realm": "https://center.kaspersky.com/",
            "Scope": "userId userName userEmail userSecret"
	    }), addHeaders({
	    	'Content-Type': 'application/json',
	    	'Referer': g_baseurl,
	    	'X-ApplicationVersion': 's(MyK)',
            'X-UIS-SupportedAuthFactors': 'Phone, OtpGenerator'
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('Start: ' + JSON.stringify(json));
	    var logon = json.LogonContext;
		
		if(json.Status == 'CredentialsRequired'){
			AnyBalance.trace('Сессия новая. Будем логиниться заново...');
	        
	        var params = {
                "logonContext": logon,
                "locale": "ru",
                "login": prefs.login,
                "password": prefs.password
            };
	        
	        if(json.CaptchaRequired && json.CaptchaRequired == true){
	    	    html = AnyBalance.requestGet(g_baseurl + 'api/config/reCaptcha', g_headers);
	            
	            var json = getJson(html);
	            AnyBalance.trace('Captcha: ' + JSON.stringify(json));
		        
	            var siteKey = json.siteKey; // Для рекапчи
	            var uisSiteKey = json.uisSiteKey; // Для скрытой рекапчи
	            var uisTextCaptchaUrl = json.uisTextCaptchaUrl; // Для текстовой капчи
				
				if(uisTextCaptchaUrl){ // Обнаружена текстовая капча
				    AnyBalance.trace('Сайт затребовал проверку капчи');
				    html = AnyBalance.requestPost(uisTextCaptchaUrl, JSON.stringify({'clientId': null}), addHeaders({
	    	            'Content-Type': 'application/json',
	    	            'Referer': g_baseurl,
	                }));
					
					var json = getJson(html);
					
					if(!json.captchaId){
	        	        AnyBalance.trace(html);
            	        throw new AnyBalance.Error('Не удалось получить параметры текстовой капчи. Сайт изменен?');
	                }
					
					var img = AnyBalance.requestGet(uisTextCaptchaUrl + '/' + json.captchaId + '/content', addHeaders({'Referer': g_baseurl}));
					
					var captcha = AnyBalance.retrieveCode('Пожалуйста, введите символы с картинки', img, {time: 180000});
					params["captchaAnswer"] = captcha;
					params["captchaId"] = json.captchaId;
	    	        params["captchaType"] = "textImage";
				}else if(uisSiteKey){ // Обнаружена скрытая рекапча
				    AnyBalance.trace('Сайт затребовал проверку reCaptcha');
					var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', g_baseurl, uisSiteKey, {USERAGENT: g_headers['User-Agent']});
	    	        params["captchaAnswer"] = captcha;
	    	        params["captchaType"] = "invisible_recaptcha";
	            }else{
	        	    AnyBalance.trace(html);
            	    throw new AnyBalance.Error('Не удалось получить параметры капчи. Сайт изменен?');
				}
			}
	        
	        html = AnyBalance.requestPost('https://eu.uis.kaspersky.com/v3/logon/proceed', JSON.stringify(params), addHeaders({
	    	    'Content-Type': 'application/json',
	    	    'Referer': g_baseurl,
	        }));
	        
	        var json = getJson(html);
		    AnyBalance.trace('Proceed: ' + JSON.stringify(json));
	        
	        if(json.Status !== 'Success'){
	    	    var error = json.Status;
	    	    if(error){
					if(/InvalidCaptchaAnswer/i.test(error)){
						throw new AnyBalance.Error('Неверный код!', null, false);
					}else if(/InvalidRegistrationData/i.test(error)){
	    		        throw new AnyBalance.Error('Неверные логин или пароль!', null, true);
					}else{
						throw new AnyBalance.Error(error, null, false);
					}
				}
	    	    
	    	    AnyBalance.trace(html);
        	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	        }
		}else if(json.Status == 'Authenticated'){
			AnyBalance.trace('Сессия устарела. Пробуем обновить...');
		}else{
			AnyBalance.trace('Неизвестный статус запроса: ' + json.Status);
		}
        
        html = AnyBalance.requestPost('https://eu.uis.kaspersky.com/v3/logon/complete_active', JSON.stringify({
            "logonContext": logon,
            "TokenType": "SamlDeflate",
            "RememberMe": true
        }), addHeaders({
	    	'Content-Type': 'application/json',
	    	'Referer': g_baseurl,
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('Complete active: ' + JSON.stringify(json));
	    
	    if(!json.UserToken){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось получить токен пользователя. Сайт изменен?');
	    }
        
	    var samlDeflatedToken = json.UserToken;
        
        html = AnyBalance.requestPost(g_baseurl + 'SignIn/CompleteRestLogon', JSON.stringify({
            "samlDeflatedToken": samlDeflatedToken,
            "rememberMe": true,
            "resendActivationLink": false,
            "returnUrl": g_baseurl
        }), addHeaders({
	    	'Content-Type': 'application/json',
	    	'Referer': g_baseurl,
	    	'X-Requested-With': 'XMLHttpRequest',
            'X-Xsrf-Token': token
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('CompleteRestLogon: ' + JSON.stringify(json));
	    if(!json.returnUrl){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось получить ссылку для переадресации. Сайт изменен?');
	    }
	    
	    var returnUrl = json.returnUrl;
	    var userId = json.userId;
		var regExp = new RegExp('"myKasperskyId":\\s*?"' + userId + '"', 'i');
	    
	    html = AnyBalance.requestGet(returnUrl, g_headers);
	    
	    if(!regExp.test(html)){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		if(/\/auth\/layout\/main/i.test(html)){
	    	AnyBalance.trace(html);
		    throw new AnyBalance.Error('Требуется принять соглашение с пользователем. Войдите в кабинет ' + g_baseurl + ' через браузер и примите соглашение', null, true);
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	html = AnyBalance.requestGet(g_baseurl + 'MyLicenses/GetProductUsagesAndViewSettings', addHeaders({
		'Referer': AnyBalance.getLastUrl(),
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var json = getJson(html);
//	AnyBalance.trace('Подписки: ' + JSON.stringify(json));
	var returnUrl = json.returnUrl;
	var userId = json.userId;
	
	if(!json){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Информация о подписках не найдена!');
    }
	
	var allProducts = [];
	
	if(json.productUsages && json.productUsages.length && json.productUsages.length > 0)
	    allProducts = allProducts.concat(json.productUsages);
	
	if(json.unusedProductUsages && json.unusedProductUsages.length && json.unusedProductUsages.length > 0)
	    allProducts = allProducts.concat(json.unusedProductUsages);
	
	if(!allProducts.length || allProducts.length < 1)
    	throw new AnyBalance.Error('У вас нет ни одной подписки!');
	
	var result = {success: true};
	
	AnyBalance.trace('Найдено подписок: ' + allProducts.length);
	
	var svcSelected, svcDefault;
    for(var i=0; i<allProducts.length; ++i){
    	var svc = allProducts[i];
		AnyBalance.trace('Найдена подписка ' + svc.brandedNameModel.value + ' (' + (!svc.isExpired ? 'активна' : 'срок действия истек') + ')');

    	if(!prefs.lic_id && !svcDefault) // Первую сразу делаем дефолтной
    		svcDefault = allProducts[0];

    	if(!svcSelected && prefs.lic_id && new RegExp(prefs.lic_id, 'i').test(svc.brandedNameModel.value)){
    		svcSelected = svc;
    		break;
    	}

    	if(!prefs.lic_id && !svc.isExpired){ // Ищем активную подписку в первую очередь
    		svcSelected = svc;
    		break;
    	}
    }
	
	if(!svcSelected){
		if(prefs.lic_id){
    	    throw new AnyBalance.Error('Не удалось найти подписку с названием ' + prefs.lic_id);
		}else{
			AnyBalance.trace('Не удалось найти ни одной активной подписки. Пробуем получить информацию по первой устаревшей подписке...');
		}
	}

    var svc = svcSelected || svcDefault;
	AnyBalance.trace('Выбрана подписка ' + svc.brandedNameModel.value);
	
	var productId = svc.licenseId;
	var svc_status = {true: 'Срок действия истек', false: 'Активна', undefined: ''};

	getParam(json.productUsages && json.productUsages.length, result, 'total', null, null, parseBalance);
	getParam(json.unusedProductUsages && json.unusedProductUsages.length, result, 'unusages', null, null, parseBalance);
	
	if(svc.activationCode){
		if(svc.isActivationCodeMasked){
	        getParam(svc.activationCode, result, '__tariff');
	    }else{
		    getParam(svc.activationCode.replace(/^(.*)-(.*)-(.*)-(.*)$/i, '$1-*****-*****-$4'), result, '__tariff');
	    }
	}else{
		result.__tariff = svc.brandedNameModel.value;
	}
	
	if(svc.isActivated){
	    getParam(svc_status[svc.isExpired]||svc.isExpired, result, 'status');
	}else{
		result.status = 'Не активирована';
	}
	
	getParam(svc.licenseUsagesCount||0, result, 'devices', null, null, parseBalance);
	getParam(svc.brandedNameModel.name, result, 'products');
	getParam(svc.activationCode||(svc.isFreeLicense ? 'Бесплатная' : 'Нет данных'), result, 'activation_code');
	if(svc.activationDate)
	    getParam(svc.activationDate, result, 'active_date', null, null, parseDateISO);
	if(svc.expirationDate)
	    getParam(svc.expirationDate, result, 'expires_date', null, null, parseDateISO);
	getParam(svc.termInDays||0, result, 'product_term', null, null, parseBalance);
	getParam(svc.daysRemainder||0, result, 'expires_days', null, null, parseBalance);
	getParam(svc.brandedNameModel.value, result, 'product_desc');
	getParam(svc.totalSlotsCount||0, result, 'slots_count', null, null, parseBalance);

    if (AnyBalance.isAvailable('all_devices')) {
        html = AnyBalance.requestGet(g_baseurl + 'MyDevices/api/DeviceList', addHeaders({
	    	'Referer': AnyBalance.getLastUrl(),
	    	'X-Requested-With': 'XMLHttpRequest'
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('Устройства: ' + JSON.stringify(json));
	
	    var devices = json.devices;
	
	    if(devices && devices.length > 0) {
            AnyBalance.trace('Найдено устройств: ' + devices.length);
	    	for(var i=devices.length-1; i>=0; i--) {
	    		var device = devices[i];
	    		sumParam(device.deviceAlias + ' (' + device.osTypeLabel + ')', result, 'all_devices', null, null, null, create_aggregate_join(',<br>'));
	    	}
	    }else{
	    	AnyBalance.trace('Не удалось найти информацию об устройствах');
			result.all_devices = 'Нет устройств';
	    }
	}
	
	if (AnyBalance.isAvailable('country', 'email', 'fio')) {
		var info = g_savedData.get('info'); // Иногда запрос профиля требует подтверждения по e-mail, поэтому сохраняем данные для вывода
	    if(!info) info = {};
		
		try{
	        html = AnyBalance.requestGet(g_baseurl + 'MyAccountApi', addHeaders({
	    	    'Referer': AnyBalance.getLastUrl(),
	    	    'X-Requested-With': 'XMLHttpRequest'
	        }));
	        
	        var json = getJson(html);
		    AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	        
	        info.country = getParam(json.CountryName, result, 'country');
	        info.email = getParam(json.CurrentEmail, result, 'email');
	        info.fio = getParam(json.CurrentAlias, result, 'fio');
			
			AnyBalance.trace('Данные профиля получены. Сохраняем...');
		    g_savedData.set('info', info);
		    g_savedData.save();
		}catch(e){
		    if(info && JSON.stringify(info) !== '{}'){
		        AnyBalance.trace('Данные профиля сохранены. Восстанавливаем значения...');
		        result.country = info.country||null;
			    result.email = info.email||null;
			    result.fio = info.fio||null;
		    }else{
			    AnyBalance.trace('Не удалось получить данные по профилю: ' + e.message);
		    }
	    }
	}
    
	AnyBalance.setResult(result);
}