/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_webHeaders = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; AUM-L29 Build/HONORAUM-L29; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36',
    'X-Requested-With': 'ru.alfabank.mobile.android'
};

var g_headers = {
	'APP-VERSION': '10.58',
    'OS-VERSION': '8.0.0',
    'OS': 'android',
    'DEVICE-MODEL': 'HUAWEI AUM-L29',
    'ChannelID': 'M2',
    'applicationId': 'ru.alfabank.mobile.android',
    'appVersion': '10.58',
    'osVersion': '8.0.0',
    'Connection': 'Keep-Alive',
    'User-Agent': 'okhttp/3.10.0'
};

var g_mainHtml;
var g_baseurlApi = 'https://alfa-mobile.alfabank.ru/ALFAJMB';
var g_baseurl_auth = 'https://private.auth.alfabank.ru';
var g_savedData;

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function getUrlVars(url) {
    var hash;
    var json = {};
    var hashes = url.slice(url.indexOf('?') + 1).split('&');
	
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        json[hash[0]] = hash[1];
    }
    
//	AnyBalance.trace('JSON с токенами: ' + JSON.stringify(json));
	return json;
}
	
function saveTokens(json){
	g_savedData.set('accessToken', json.access_token);
	g_savedData.set('refreshToken', json.refresh_token);
    g_savedData.set('sessionToken', json.session_token);
	g_savedData.set('expiresIn', json.expires_in);
	g_savedData.set('userName', json.username);
	g_savedData.set('idPl', json.idpl);
	g_savedData.save();
}

function login(prefs){
	var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	
	var login = prefs.login.replace(/[^\d]+/g, '');
	
    if (/^\d+$/.test(login)){
	    checkEmpty(/^\d{10}$/.test(login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
		var formattedLogin = login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '7$1$2$3$4');
	}
	
	if (prefs.method === 'card'){
	    checkEmpty(prefs.cardnum, 'Введите номер карты!');
    }
	
	var cardnum = prefs.cardnum.replace(/[^\d]+/g, '');
	
	if (prefs.method === 'card' && /^\d+$/.test(cardnum)){
	    checkEmpty(/^\d{16}$/.test(cardnum), 'Введите номер карты - 16 цифр без пробелов и разделителей!');
	}
	
	if (prefs.method === 'account'){
	    checkEmpty(prefs.accountnum, 'Введите номер счета!');
	}
	
    var accountnum = prefs.accountnum.replace(/[^\d]+/g, '');
	
	if (prefs.method === 'account' && /^\d+$/.test(accountnum)){
	    checkEmpty(/^\d{20}$/.test(accountnum), 'Введите номер счета - 20 цифр без пробелов и разделителей!');
	}
	
	var authType;
	
	if(prefs.method === 'card' && cardnum){
		authCardNum = cardnum;
		authType = 'CARD';
		authAccontNum = '';
	}else if(prefs.method === 'account' && accountnum){
		authAccontNum = accountnum;
		authType = 'ACCOUNT';
		authCardNum = '';
	}else{
		throw new AnyBalance.Error('Некорректные данные. Проверьте данные для входа и попробуйте еще раз');	
	}
	
	var deviceId = generateUUID();
	var deviceUUId = generateUUID();
	var ksId = generateUUID();
	
	var dt = new Date();
    var deviceBootTime = '' + (Math.floor(+dt/1000) % 84138);
	
	var launchTime = Math.floor(new Date().getTime() / 1000) - 180; // Время запуска приложения для куки _sp_id.3c2b
	
	var html = AnyBalance.requestGet(g_baseurlApi + '/openid/.well-known/openid-configuration', g_headers);
	var json = getJson(html);

	var html = AnyBalance.requestGet(g_baseurl_auth + '/passport/openid-blue/authorize?client_id\u003dmobile-app\u0026scope\u003dopenid%20mobile-bank\u0026device_app_version\u003d10.58%20%282015001301%29\u0026device_id\u003d' + deviceId + '\u0026device_uuid\u003d' + deviceUUId + '\u0026device_model\u003dHUAWEI%20AUM-L29\u0026device_locale\u003dru_RU\u0026device_name\u003dHWAUM-Q\u0026device_os_version\u003dAndroid%20%2826%29\u0026device_boot_time\u003d' + deviceBootTime + '\u0026device_timezone\u003d%2B0300', g_webHeaders);
	
	var spIdPrefix = generateUUID(); // Префикс для куки _sp_id.3c2b
	var spIdSuffix = generateUUID(); // Суффикс для куки _sp_id.3c2b
	
//	AnyBalance.setCookie('private.auth.alfabank.ru', 'capsLockPushed', false);
//	AnyBalance.setCookie('private.auth.alfabank.ru', 'closedNotifsIds', '');
//	AnyBalance.setCookie('private.auth.alfabank.ru', '_sp_ses.3c2b', '*');
	AnyBalance.setCookie('private.auth.alfabank.ru', 'oxxfgh', '' + ksId + '#0#1800000#5000#1800000#12521');
//	AnyBalance.setCookie('private.auth.alfabank.ru', 'KFP_DID', '' + generateUUID());
//	AnyBalance.setCookie('private.auth.alfabank.ru', 'vfdq', 'done');
//	AnyBalance.setCookie('private.auth.alfabank.ru', '_sp_id.3c2b', spIdPrefix + '.' + launchTime + '.1.' + Math.floor(new Date().getTime() / 1000) + '.' + launchTime + '.' + spIdSuffix);
	
	
	var html = AnyBalance.requestPost(g_baseurl_auth + '/passport/cerberus-mini-green/dashboard-green/api/oid/phoneRegistrationCustomer', JSON.stringify({
        'queryRedirectParams': {
			'is_webview': 'true',
			'client_id': 'mobile-app',
			'scope': 'openid mobile-bank',
			'device_app_version': '10.58 (2015001301)',
			'device_id': deviceId,
			'device_uuid': deviceUUId,
			'device_model': 'HUAWEI AUM-L29',
			'device_locale': 'ru_RU',
			'device_name': 'HWAUM-Q',
			'device_os_version': 'Android (26)',
			'device_boot_time': deviceBootTime,
			'device_timezone': ' 0300',
			'acr_values': 'phone_auth:sms',
			'non_authorized_user': 'true'
		},
		'phone': formattedLogin
    }), addHeaders({
        'X-CSRF-Token': 'undefined',
		'X-Request-ID': generateUUID(),
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': g_baseurl_auth,
		'Referer': g_baseurl_auth + '/passport/cerberus-mini-blue/dashboard-blue/phone_auth?is_webview\u003dtrue\u0026client_id\u003dmobile-app\u0026scope\u003dopenid%20mobile-bank\u0026device_app_version\u003d10.58%20%282015001301%29\u0026device_id\u003d' + deviceId + '\u0026device_uuid\u003d' + deviceUUId + '\u0026device_model\u003dHUAWEI%20AUM-L29\u0026device_locale\u003dru_RU\u0026device_name\u003dHWAUM-Q\u0026device_os_version\u003dAndroid%20%2826%29\u0026device_boot_time\u003d' + deviceBootTime + '\u0026device_timezone\u003d%2B0300\u0026acr_values\u003dphone_auth:sms\u0026non_authorized_user\u003dtrue'
	}), g_webHeaders);
	
	var json = getJson(html);
	
    // Всегда дает ошибку 'Некорректные данные', в приложении выполняется до ввода номера телефона. Поэтому, ошибку не обрабатываем
	
	AnyBalance.setCookie('private.auth.alfabank.ru', '_sp_id.3c2b', spIdPrefix + '.' + launchTime + '.1.' + Math.floor(new Date().getTime() / 1000) + '.' + launchTime + '.' + spIdSuffix);
	
	var html = AnyBalance.requestPost(g_baseurl_auth + '/passport/cerberus-mini-green/dashboard-green/api/oid/registerCustomer', JSON.stringify({
        'credentials': {
			'phone': formattedLogin,
			'card': authCardNum,
			'accountNumber': authAccontNum,
			'type': authType,
			'ksid': ksId,
			'queryRedirectParams': {
				'is_webview': 'true',
				'client_id': 'mobile-app',
				'scope': 'openid mobile-bank',
				'device_app_version': '10.58 (2015001301)',
				'device_id': deviceId,
				'device_uuid': deviceUUId,
				'device_model': 'HUAWEI AUM-L29',
				'device_locale': 'ru_RU',
				'device_name': 'HWAUM-Q',
				'device_os_version': 'Android (26)',
				'device_boot_time': deviceBootTime,
				'device_timezone': ' 0300',
				'acr_values': 'card_account:sms',
				'non_authorized_user': 'true'
			}
		}
    }), addHeaders({
        'X-CSRF-Token': 'undefined',
		'X-Request-ID': generateUUID(),
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': g_baseurl_auth,
		'Referer': g_baseurl_auth + '/passport/cerberus-mini-green/dashboard-green/card_account?is_webview\u003dtrue\u0026client_id\u003dmobile-app\u0026scope\u003dopenid%20mobile-bank\u0026device_app_version\u003d10.58%20%282015001301%29\u0026device_id\u003d' + deviceId + '\u0026device_uuid\u003d' + deviceUUId + '\u0026device_model\u003dHUAWEI%20AUM-L29\u0026device_locale\u003dru_RU\u0026device_name\u003dHWAUM-Q\u0026device_os_version\u003dAndroid%20%2826%29\u0026device_boot_time\u003d' + deviceBootTime + '\u0026device_timezone\u003d%200300\u0026acr_values\u003dcard_account%3Asms\u0026non_authorized_user\u003dtrue'
	}), g_webHeaders);
	
	var json = getJson(html);
	
	if (json.error) {
		var error = (json.errors || []).map(function(e) { return e.message }).join('\n');
		if(error)
			throw new AnyBalance.Error(error, null, /номер|телефон|карт|счет/i.test(error));	
		    
       	    AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
    }
	
	var redirectUrl = json.redirectUrl;
	var previousMultiFactorResponseParams = json.params;
	
	AnyBalance.setCookie('private.auth.alfabank.ru', '_sp_id.3c2b', spIdPrefix + '.' + launchTime + '.1.' + Math.floor(new Date().getTime() / 1000) + '.' + launchTime + '.' + spIdSuffix);
	
	var html = AnyBalance.requestPost(g_baseurl_auth + '/passport/cerberus-mini-green/dashboard-green/api/oid/reference', JSON.stringify({
		'queryRedirectParams': {
			'is_webview': 'true',
			'client_id': 'mobile-app',
			'scope': 'openid mobile-bank',
			'device_app_version': '10.58 (2015001301)',
			'device_id': deviceId,
			'device_uuid': deviceUUId,
			'device_model': 'HUAWEI AUM-L29',
			'device_locale': 'ru_RU',
			'device_name': 'HWAUM-Q',
			'device_os_version': 'Android (26)',
			'device_boot_time': deviceBootTime,
			'device_timezone': ' 0300',
			'acr_values': 'card_account:sms',
			'non_authorized_user': 'true'
		},
		'previousMultiFactorResponseParams': previousMultiFactorResponseParams,
		'is_push': true,
		'type': authType
	}), addHeaders({
        'x-b3-spanid': AnyBalance.getLastResponseHeader('X-B3-SpanId'),
        'X-CSRF-Token': 'undefined',
        'x-b3-traceid': AnyBalance.getLastResponseHeader('X-B3-TraceId'),
		'X-Request-ID': generateUUID(),
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': g_baseurl_auth,
		'Referer': g_baseurl_auth + '/passport/cerberus-mini-green/dashboard-green/sms?is_webview\u003dtrue\u0026client_id\u003dmobile-app\u0026scope\u003dopenid%20mobile-bank\u0026device_app_version\u003d10.58%20%282015001301%29\u0026device_id\u003d' + deviceId + '\u0026device_uuid\u003d' + deviceUUId + '\u0026device_model\u003dHUAWEI%20AUM-L29\u0026device_locale\u003dru_RU\u0026device_name\u003dHWAUM-Q\u0026device_os_version\u003dAndroid%20%2826%29\u0026device_boot_time\u003d' + deviceBootTime + '\u0026device_timezone\u003d%200300\u0026acr_values\u003dcard_account%3Asms\u0026non_authorized_user\u003dtrue'
	}), g_webHeaders);
	
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

	AnyBalance.setCookie('private.auth.alfabank.ru', '_sp_id.3c2b', spIdPrefix + '.' + launchTime + '.1.' + Math.floor(new Date().getTime() / 1000) + '.' + launchTime + '.' + spIdSuffix);
	
	var html = AnyBalance.requestPost(g_baseurl_auth + '/passport/cerberus-mini-green/dashboard-green/api/oid/finishCustomerRegistration', JSON.stringify({
		'credentials': {
			'queryRedirectParams': {
				'is_webview': 'true',
				'client_id': 'mobile-app',
				'scope': 'openid mobile-bank',
				'device_app_version': '10.58 (2015001301)',
				'device_id': deviceId,
				'device_uuid': deviceUUId,
				'device_model': 'HUAWEI AUM-L29',
				'device_locale': 'ru_RU',
				'device_name': 'HWAUM-Q',
				'device_os_version': 'Android (26)',
				'device_boot_time': deviceBootTime,
				'device_timezone': ' 0300',
				'acr_values': 'card_account:sms',
				'non_authorized_user': 'true'
			},
			'previousMultiFactorResponseParams': previousMultiFactorResponseParams,
			'is_push': false,
			'type': authType,
			'code': code
		}
	}), addHeaders({
        'x-b3-spanid': AnyBalance.getLastResponseHeader('X-B3-SpanId'),
        'X-CSRF-Token': 'undefined',
        'x-b3-traceid': AnyBalance.getLastResponseHeader('X-B3-TraceId'),
		'X-Request-ID': generateUUID(),
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': g_baseurl_auth,
		'Referer': g_baseurl_auth + '/passport/cerberus-mini-green/dashboard-green/sms?is_webview\u003dtrue\u0026client_id\u003dmobile-app\u0026scope\u003dopenid%20mobile-bank\u0026device_app_version\u003d10.58%20%282015001301%29\u0026device_id\u003d' + deviceId + '\u0026device_uuid\u003d' + deviceUUId + '\u0026device_model\u003dHUAWEI%20AUM-L29\u0026device_locale\u003dru_RU\u0026device_name\u003dHWAUM-Q\u0026device_os_version\u003dAndroid%20%2826%29\u0026device_boot_time\u003d' + deviceBootTime + '\u0026device_timezone\u003d%200300\u0026acr_values\u003dcard_account%3Asms\u0026non_authorized_user\u003dtrue'
	}), g_webHeaders);
	
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
	previousMultiFactorResponseParams['auth_type'] = authType;
	
//	var queryRedirectParamsUrl = new URLSearchParams(previousMultiFactorResponseParams).toString(); // URLSearchParams не работает в AB+
	
	var params = previousMultiFactorResponseParams;
	
	var queryRedirectParamsUrl = createParams(params); // URL из params (previousMultiFactorResponseParams)
	
	AnyBalance.setCookie('private.auth.alfabank.ru', '_sp_id.3c2b', spIdPrefix + '.' + launchTime + '.1.' + Math.floor(new Date().getTime() / 1000) + '.' + launchTime + '.' + spIdSuffix);
	
	var html = AnyBalance.requestGet(g_baseurlApi + '/openid/authorizeRedirect' + queryRedirectParamsUrl, addHeaders({
		'Referer': g_baseurl_auth + '/'
	}), g_webHeaders);
	
	var tokensUrl = AnyBalance.getLastUrl();
	
	if(!/access_token/i.test(tokensUrl)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить токены. Сайт изменен?');
	}else{
		getUrlVars(tokensUrl);
		saveTokens(json);
		AnyBalance.trace('Токены получены и сохранены');
	}
	
	var html = AnyBalance.requestGet('https://web.alfabank.ru/dashboard', g_webHeaders);
	
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