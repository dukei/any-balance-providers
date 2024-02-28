/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

var g_mainHtml;
var g_baseurl_auth = 'https://private.auth.alfabank.ru';
var g_savedData;

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

function login(prefs){
	var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
    
	var canvasFingerprint = g_savedData.get('canvasFingerprint');
	if(!canvasFingerprint){
		canvasFingerprint = generateUUID();
		g_savedData.set('canvasFingerprint', canvasFingerprint);
		g_savedData.save();
	}
	
	var webglFingerprint = g_savedData.get('webglFingerprint');
	if(!webglFingerprint){
		webglFingerprint = generateUUID();
		g_savedData.set('webglFingerprint', webglFingerprint);
		g_savedData.save();
	}
	
	var html = AnyBalance.requestGet('https://web.alfabank.ru/', g_headers);
	
	var ref = AnyBalance.getLastUrl();
	
	var html = AnyBalance.requestPost(g_baseurl_auth + '/passport/cerberus-mini-blue/dashboard-blue/api/oid/authorize', JSON.stringify({
        "username": prefs.login,
        "password": prefs.password,
        "queryRedirectParams": {
            "response_type": "code",
            "client_id": "newclick-web",
            "scope": "openid newclick-web",
            "acr_values": "username",
            "non_authorized_user": "true"
        },
        "currentRoute": "/username"
    }), addHeaders({
        'X-Csrf-Token': 'undefined',
		'X-Request-Id': generateUUID(),
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': g_baseurl_auth,
		'Referer': ref
	}));
	
	var json = getJson(html);
	
	if (json.error) {
		var error = (json.errors || []).map(function(e) { return e.message }).join('\n');
		if(error)
			throw new AnyBalance.Error(error, null, /номер|телефон|карт|счет|данные/i.test(error));	
		    
       	    AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
    }
	
	var redirectUrl = json.redirectUrl;
	var previousMultiFactorResponseParams = json.params;
	
	var html = AnyBalance.requestPost(g_baseurl_auth + '/passport/cerberus-mini-blue/dashboard-blue/api/oid/reference', JSON.stringify({
        "queryRedirectParams": {
            "response_type": "code",
            "client_id": "newclick-web",
            "scope": "openid newclick-web",
            "acr_values": "username",
            "non_authorized_user": "true"
        },
        "previousMultiFactorResponseParams": previousMultiFactorResponseParams,
        "is_push": true,
        "type": "CARD"
    }), addHeaders({
        'X-Csrf-Token': 'undefined',
		'X-Request-Id': generateUUID(),
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': g_baseurl_auth,
		'Referer': ref
	}));
	
	var json = getJson(html);
	
	if (json.error) {
		var error = (json.errors || []).map(function(e) { return e.message }).join('\n');
		if(error)
			throw new AnyBalance.Error(error, null, /номер|телефон/i.test(error));	
		    
       	    AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
    }
	
	previousMultiFactorResponseParams['reference'] = json.reference.reference;
	previousMultiFactorResponseParams['masked_phone'] = json.reference.masked_phone;
	
	AnyBalance.trace('Затребован одноразовый пароль для входа из SMS');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите одноразовый пароль для входа из SMS, высланного на номер +' + json.reference.masked_phone, null, {inputType: 'number', time: 180000});
	
	var html = AnyBalance.requestPost(g_baseurl_auth + '/passport/cerberus-mini-blue/dashboard-blue/api/oid/finishCustomerRegistration', JSON.stringify({
        "credentials": {
            "queryRedirectParams": {
                "response_type": "code",
                "client_id": "newclick-web",
                "scope": "openid newclick-web",
                "acr_values": "username",
                "non_authorized_user": "true"
            },
            "previousMultiFactorResponseParams": previousMultiFactorResponseParams,
            "is_push": false,
            "type": "CARD",
            "fingerprint": {
                "canvas_fingerprint_v1": canvasFingerprint,
                "webgl_fingerprint_v1": webglFingerprint
            },
            "code": code
        }
    }), addHeaders({
        'X-Csrf-Token': 'undefined',
		'X-Request-Id': generateUUID(),
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': g_baseurl_auth,
		'Referer': ref
	}));
	
	var json = getJson(html);
	
	if (json.error) {
		var error = (json.errors || []).map(function(e) { return e.message }).join('\n');
		if(error)
			throw new AnyBalance.Error(error, null, /парол|код/i.test(error));	
		    
       	    AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
    }
	
	if(!json.redirectUrl){
    	throw new AnyBalance.Error('Не удалось получить ссылку для переадресации. Сайт изменен?');
    }
	
	previousMultiFactorResponseParams['code'] = json.params.code;
	previousMultiFactorResponseParams['expires_in'] = json.params.expires_in;
	
//	var queryRedirectParamsUrl = new URLSearchParams(previousMultiFactorResponseParams).toString(); // URLSearchParams не работает в AB+
	
	var params = previousMultiFactorResponseParams;
	
	var queryRedirectParamsUrl = createParams(params); // URL из params (previousMultiFactorResponseParams)
	
	var html = AnyBalance.requestGet('https://web.alfabank.ru/openid/authorize/newclick-web' + queryRedirectParamsUrl, addHeaders({
		'Referer': g_baseurl_auth + '/'
	}));
	
	if(!/dashboard/i.test(AnyBalance.getLastUrl())){
		AnyBalance.trace('Не удалось перейти на главную страницу. Пробуем перейти принудительно...');
	
	    var html = AnyBalance.requestGet('https://web.alfabank.ru/dashboard', addHeaders({'Referer': g_baseurl_auth + '/'}), g_headers);
	}
	
	if(!/logout/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
	}else{
		AnyBalance.trace('Вход выполнен успешно');
		g_mainHtml = html;
    }
	
	g_savedData.setCookies();
	g_savedData.save();
	
	return html;
}

function createParams(params) {
	var str = '';
	for (var param in params) {
		str += str ? '&' : '?';
		str += encodeURIComponent(param);
		str += '=';
		str += encodeURIComponent(params[param]);
	}
	return str;
}