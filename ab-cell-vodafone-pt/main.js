/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://webfecs.vodafone.pt/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Please, enter the login!');
	checkEmpty(prefs.password, 'Please, enter the password!');

	var html = AnyBalance.requestGet('http://m.my.vodafone.pt/', g_headers);

	html = AnyBalance.requestPost(baseurl + 'mcare/Auth_Login', {
		loginType:'myvodafone',
		myVdfLogin:prefs.login,
		action:'authenticate',
		myVdfPassword:prefs.password,
	}, addHeaders({
		Referer: baseurl + 'mcare/Auth_Login',
		Origin:'https://webfecs.vodafone.pt'
	}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="ianoaco"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Utilizador\s+inválido/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login into selfcare. The site has been changed?');
	}
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'mcare/Auth_Select?selectService=' + prefs.login, g_headers);
	
	getParam(html, result, 'balance', />Saldo(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', />Plano Tarifario(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'points', />Pontos Clube Viva(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<table(?:[^>]*>){15}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(prefs.login, result, 'phone');
	
	AnyBalance.setResult(result);
}