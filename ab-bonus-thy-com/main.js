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
	var baseurl = 'https://www4.thy.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'tkmiles/login.tk?lang=en', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'tkmiles/j_security_check?lang=en', {
		'TK': 'TK',
		'j_username': prefs.login,
		'j_password': prefs.password,
		'submit': ''
	}, addHeaders({Referer: baseurl + 'tkmiles/login.tk'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /error-icon"(?:[^>]*>){5}\s*<.l[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /incorect/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, is the site is changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'miles', /Status miles earned in last 12 months(?:[^>]*>){2}([\s\d.,]+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total_miles', /Total miles<(?:[^>]*>){2}([\s\d.,]+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'miles_from_enrolment', /Total miles since enrollment(?:[^>]*>){2}([\s\d.,]+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}