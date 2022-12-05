/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.6',
	'Connection': 'keep-alive',
	'upgrade-insecure-requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
};

var baseurl = 'https://my.kaspersky.com/';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
	    g_savedData = new SavedData('my.kaspersky', prefs.login);

	g_savedData.restoreCookies();
	
	var html = AnyBalance.requestGet('https://my.kaspersky.com/MyLicenses', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    
    if(!/\/portal\/pages\/licenses/i.test(html)){
    	AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		
        html = AnyBalance.requestGet('https://my.kaspersky.com/api/config/common', addHeaders({
	    	Accept: 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json',
	    	Referer: 'https://my.kaspersky.com/',
	    	'x-requested-with': 'XMLHttpRequest'
	    }));
	    
	    var json = getJson(html);
	    var token = json.globalSettings.xsrfToken;
		if(!json || !json.globalSettings || !json.globalSettings.xsrfToken){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	    }

	    html = AnyBalance.requestPost('https://eu.uis.kaspersky.com/v3/logon/start', JSON.stringify({
            "Realm": "https://center.kaspersky.com/",
            "Scope": "userId userName userEmail userSecret"
	    }), addHeaders({
	    	Accept: 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json',
	    	Origin: 'https://my.kaspersky.com',
	    	Referer: 'https://my.kaspersky.com/',
	    	'X-ApplicationVersion': 's(MyK)',
            'X-UIS-SupportedAuthFactors': 'Phone, OtpGenerator'
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('Start: ' + JSON.stringify(json));
	    var logon = json.LogonContext;
	
	    var params = {
            "logonContext": logon,
            "locale": "ru",
            "login": prefs.login,
            "password": prefs.password
        };
	
	    if(json.CaptchaRequired && json.CaptchaRequired == true){
            AnyBalance.trace('Сайт затребовал проверку reCaptcha');
	    	html = AnyBalance.requestGet('https://my.kaspersky.com/api/config/reCaptcha', g_headers);
	    
	        var json = getJson(html);
	        AnyBalance.trace('Captcha: ' + JSON.stringify(json));
	    	
	    	if(!json || !json.siteKey || !json.uisSiteKey || !json.uisTextCaptchaUrl){
	        	AnyBalance.trace(html);
            	throw new AnyBalance.Error('Не удалось получить ключ сайта. Сайт изменен?');
	        }
		
	        var siteKey = json.siteKey; // Для рекапчи
	        var uisSiteKey = json.uisSiteKey; // Для скрытой рекапчи
	        var uisTextCaptchaUrl = json.uisTextCaptchaUrl; // Для текстовой капчи
		    
			var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl + '/', uisSiteKey, {USERAGENT: g_headers['User-Agent']});
	    	params["captchaAnswer"] = captcha;
	    	params["captchaType"] = "invisible_recaptcha";
	    }
	    
	    html = AnyBalance.requestPost('https://eu.uis.kaspersky.com/v3/logon/proceed', JSON.stringify(params), addHeaders({
	    	Accept: 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json',
	    	Origin: 'https://my.kaspersky.com',
	    	Referer: 'https://my.kaspersky.com/',
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('Proceed: ' + JSON.stringify(json));
	    
	    if(json.Status !== 'Success'){
	    	var error = json.Status;
	    	if(error)
	    		throw new AnyBalance.Error('Неверные логин или пароль!', null, /InvalidRegistrationData/i.test(error));
	    	
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
        
        html = AnyBalance.requestPost('https://eu.uis.kaspersky.com/v3/logon/complete_active', JSON.stringify({
            "logonContext": logon,
            "TokenType": "SamlDeflate",
            "RememberMe": false
        }), addHeaders({
	    	Accept: 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json',
	    	Origin: 'https://my.kaspersky.com',
	    	Referer: 'https://my.kaspersky.com/',
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('Complete active: ' + JSON.stringify(json));
	    
	    if(!json.UserToken){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось получить токен пользователя. Сайт изменен?');
	    }
        
	    var samlDeflatedToken = json.UserToken;
        
        html = AnyBalance.requestPost('https://my.kaspersky.com/SignIn/CompleteRestLogon', JSON.stringify({
            "samlDeflatedToken": samlDeflatedToken,
            "rememberMe": false,
            "resendActivationLink": false,
            "returnUrl": "https://my.kaspersky.com/"
        }), addHeaders({
	    	Accept: 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json',
	    	Origin: 'https://my.kaspersky.com',
	    	Referer: 'https://my.kaspersky.com/',
	    	'x-requested-with': 'XMLHttpRequest',
            'x-xsrf-token': token
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('CompleteRestLogon: ' + JSON.stringify(json));
	    if(!json.returnUrl){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось получить ссылку для переадресации. Сайт изменен?');
	    }
	    
	    var returnUrl = json.returnUrl;
	    var userId = json.userId;
	    
	    html = AnyBalance.requestGet(returnUrl, g_headers);
	    
	    if(!/\/portal\/pages\/licenses/i.test(html)){
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	    
	    g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	html = AnyBalance.requestGet('https://my.kaspersky.com/MyLicenses/GetProductUsagesAndViewSettings', addHeaders({
		'Content-Type': 'application/json',
		Referer: AnyBalance.getLastUrl(),
		'x-requested-with': 'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Лицензии: ' + JSON.stringify(json));
	var returnUrl = json.returnUrl;
	var userId = json.userId;
	
	if(!json){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Информация о лицензиях не найдена!');
    }
	
	if(!json.productUsages || !json.productUsages.length)
    	throw new AnyBalance.Error('У вас нет ни одной лицензии!');
	
	var result = {success: true};
	
	AnyBalance.trace('Найдено лицензий: ' + json.productUsages.length);
	
	var svcSelected, svcDefault;
    for(var i=0; i<json.productUsages.length; ++i){
    	var svc = json.productUsages[i];

    	if(!prefs.lic_id && !svcDefault)
    		svcDefault = svc;

    	if(!svcSelected && prefs.lic_id && new RegExp(prefs.lic_id, 'i').test(svc.brandedNameModel.value)){
    		svcSelected = svc;
    		break;
    	}

    	if(!prefs.lic_id){ //Хотим найти неустаревшую лицензию в первую очередь
    		var till = getParam(svc.expirationDate|| undefined, null, null, null, null, parseDateISO);
    		if(till > new Date().getTime()){
    			svcSelected = svc;
    			break;
    		}
    	}
    }

    if(i >= json.productUsages.length)
    	throw new AnyBalance.Error('Не удалось найти ' + (prefs.lic_id ? 'лицензию с названием ' + prefs.lic_id : 'ни одной лицензии!'));

    var svc = svcSelected || svcDefault;
	var productId = svc.licenseId;

	getParam(json.productUsages && json.productUsages.length, result, 'total', null, null, parseBalance);
	getParam(json.unusedProductUsages && json.unusedProductUsages.length, result, 'unusages', null, null, parseBalance);
	
	getParam(svc.licenseUsagesCount, result, 'devices', null, null, parseBalance);
	getParam(svc.brandedNameModel.name, result, 'products');
	getParam(svc.activationCode, result, '__tariff');
	getParam(svc.activationCode, result, 'activation_code');
	getParam(svc.activationDate, result, 'active_date', null, null, parseDateISO);
	getParam(svc.expirationDate, result, 'expires_date', null, null, parseDateISO);
	getParam(svc.termInDays, result, 'product_term', null, null, parseBalance);
	getParam(svc.daysRemainder, result, 'expires_days', null, null, parseBalance);
	getParam(svc.brandedNameModel.value, result, 'product_desc');
	getParam(svc.totalSlotsCount, result, 'slots_count', null, null, parseBalance);

    if (AnyBalance.isAvailable('all_devices')) {
        html = AnyBalance.requestGet('https://my.kaspersky.com/MyDevices/api/DeviceList', addHeaders({
	    	'Content-Type': 'application/json',
	    	Referer: AnyBalance.getLastUrl(),
	    	'x-requested-with': 'XMLHttpRequest'
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
	    }
	}
	
	if (AnyBalance.isAvailable('country', 'email', 'fio')) {
	    html = AnyBalance.requestGet('https://my.kaspersky.com/MyAccountApi', addHeaders({
	    	'Content-Type': 'application/json',
	    	Referer: AnyBalance.getLastUrl(),
	    	'x-requested-with': 'XMLHttpRequest'
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	
	    getParam(json.CountryName, result, 'country');
	    getParam(json.CurrentEmail, result, 'email');
	    getParam(json.CurrentAlias, result, 'fio');
	}
    
	AnyBalance.setResult(result);
}