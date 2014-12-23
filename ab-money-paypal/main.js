/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language':'en-US,en;q=0.8,ru;q=0.6',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	//'Origin':'https://mobile.paypal.com'
};

function followLink(html, signature){
	var re = new RegExp('<a[^>]+href="([^"]*' + signature + ')"[^<]*>', 'i');
	var href = getParam(html, null, null, re, null, html_entity_decode);
	if(!href) {
		AnyBalance.trace(html_entity_decode(html));
		throw new AnyBalance.Error('Can not find reference ' + signature + '. Is the site changed?');
	}
	return AnyBalance.requestGet(href, g_headers);
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Enter e-mail!');
	checkEmpty(prefs.password, 'Enter password!');
    
	logInAPI(prefs);
	return;
	
	var baseurl = 'https://mobile.paypal.com/cgi-bin/wapapp';
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(/&(?:amp;)?login="/i.test(html)) {
		AnyBalance.trace('Требуется дополнительный шаг авторизации - выполняем...');
		html = followLink(html, 'login=');
	}
	
	if(/&(?:amp;)?view_balance\.x="/i.test(html)) {
		AnyBalance.trace('Идем в просмотр баланса...');
		html = followLink(html, 'view_balance.x=');
	}
	
	var form = getParam(html, null, null, /<form[^>]+name="Login"[\s\S]*?<\/form>/i);
	if(!form)
        throw new AnyBalance.Error('Can not find login form! Site is changed?');
	
    var params = createFormParams(form);
    params.login_email = prefs.login;
    params.login_password = prefs.password;
    
    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, null, html_entity_decode);
    html = AnyBalance.requestPost(action, params, g_headers);
	
	if (!/cmd=_wapapp-logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="crit"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|нужно указать действительный номер телефона или адрес электронной почты|a valid phone number or email address to log in|un número de teléfono o una dirección de correo electrónico válidos para iniciar sesión/i.test(error));
		
		AnyBalance.trace(html_entity_decode(html));
		throw new AnyBalance.Error('Can not login to PayPal. Is the site changed?');
	}
	if(!/<\/h4>([^<]*)<hr/i.test(html)){
		if(/You can't access View Balance in your country/i.test(html)) {
			AnyBalance.trace('You can\'t access View Balance in your country...');
			logIntoFullVersion(prefs);
			return;
		}
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not find PayPal balance. Is the site changed?');
    }
	
	var result = {success: true};
	
	getParam(html, result, ['currency','balance'], /<\/h4>([^<]*)<hr/i, [replaceTagsAndSpaces, /\b(?:in|в|en)\b/i, ''], parseCurrency);
    getParam(html, result, 'balance', /<\/h4>([^<]*)<hr/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}

var g_apiHeaders = {
	'Authorization': 'Basic ZDNhYWNmNDUwZGQ2YWE5OTJjZmJhNzcwNjc1NjA3MzM6N2NlYmJhMWJmMTRjYjg1OA==',
	'Accept': 'application/json',
	'Accept-Language': 'en_US',
	'Origin': 'https://api.paypal.com/'
}

function logInAPI(prefs) {
	var baseurl = 'https://api.paypal.com/v1';
	
	var json = requestAPI('post', baseurl + '/oauth2/token', {'grant_type': 'client_credentials'}, g_apiHeaders);
	
	json = requestAPI('post', baseurl + '/oauth2/login', {
		'grant_type': 'password',
		'email': prefs.login,
		'password': prefs.password,
		'redirect_uri': 'https://www.paypalmobiletest.com',
	}, addHeaders({'Authorization': json.token_type + ' ' + json.access_token}, g_apiHeaders));
	
	json = requestAPI('get', baseurl + '/wallet/@me/financial-instruments', null, addHeaders({'Authorization': json.token_type + ' ' + json.access_token}, g_apiHeaders));
	
	var result = {success: true};
	
	for(var i=0; i<json.account_balance.balances.length; i++) {
		var curr = json.account_balance.balances[i];
		if(curr.currency == 'USD') {
			getParam(curr.available.total.amount + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		} else if(curr.currency == 'EUR') {
			getParam(curr.available.total.amount + '', result, 'balance_eur', null, replaceTagsAndSpaces, parseBalance);
		}
	}
	
    AnyBalance.setResult(result);
}

function requestAPI(method, url, params, headers) {
	if(method == 'post')
		var html = AnyBalance.requestPost(url, params, headers);
	else
		var html = AnyBalance.requestGet(url, headers);
	
	json = getJson(html);
	if(!json.access_token && !/\/wallet/.test(url)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error calling API method! ' + json.error);
	}
	
	return json;
}

function logIntoFullVersion(prefs) {
	var baseurl = 'https://www.paypal.com/';
	var html = AnyBalance.requestGet(baseurl + 'cgi-bin/webscr?cmd=_login-run', g_headers);
	
	var action = getParam(html, null, null, /action="([^"]*login-submit[^"]*)/i);
	checkEmpty(action, 'Can\'t find action, is the site changed?');
	
	AnyBalance.trace('Entering full version...');
	
	var form = getParam(html, null, null, /<form[^>]+name="login_form"[\s\S]*?<\/form>/i);
	if(!form)
        throw new AnyBalance.Error('Can not find login form! Site is changed?');
	
    var params = createFormParams(form);
    params.login_email = prefs.login;
    params.login_password = prefs.password;
	
	html = AnyBalance.requestPost(action, params, addHeaders({Referer: baseurl + 'cgi-bin/webscr?cmd=_login-run'}));
	
	if (!/>\s*Logging in\s*</i.test(html)) {
		var error = getParam(html, null, null, /messageBox error"(?:[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Please make sure you enter your email address and password correctly/i.test(error));
		
		AnyBalance.trace(html_entity_decode(html));
		throw new AnyBalance.Error('Can not login to PayPal. Is the site changed?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'cgi-bin/webscr?cmd=_login-done&login_access=', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, ['currency','balance'], /PayPal balance\s*:([^>]*>){5}/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'balance', /PayPal balance\s*:([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}