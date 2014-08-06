/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://da.victoriabank.md/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + 'frontend/frontend', g_headers);

	var execKey = getParam(html, null, null, /execution=([\s\S]{4})/i);
	var href = getParam(html, null, null, /id="FORM_FAST_LOGIN"[^>]*action="\/([^"]*)/i);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'Login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		else if (name == '_flowExecutionKey')
			return execKey;
		return value;
	});
	
	if(AnyBalance.getLevel() >= 7) {
		var captcha = AnyBalance.requestGet(baseurl+ 'frontend/captcha-image.jpg');
		params.captchaText = AnyBalance.retrieveCode("Please, enter security code", captcha);
		AnyBalance.trace('Капча получена: ' + params.captchaText);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}	
	
	html = AnyBalance.requestPost(baseurl + href, params, addHeaders({Referer: baseurl + 'frontend/auth/userlogin?execution=' + execKey}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /error-title"[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /gresit Login-ul sau parola/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /class="title"[^>]*>([\d*]{10,})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', />Suma Disponibila(?:[\s\S]*?<span[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], />Suma Disponibila(?:[\s\S]*?<span[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /Titularul cardului(?:[\s\S]*?<span[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}