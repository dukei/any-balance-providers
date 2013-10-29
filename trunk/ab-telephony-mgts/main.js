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
	AnyBalance.setDefaultCharset("utf-8");
	var baseurl = "https://login.mgts.ru/amserver/UI/Login";
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestGet(baseurl, g_headers);
	var pin = prefs.password; //.substr(0, 8); //Слишком длинные пины тупо не воспринимаются
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'IDToken1') return prefs.login;
		if (name == 'IDToken2') return pin;
		return value;
	});
	html = AnyBalance.requestPost(baseurl, params, addHeaders({
		Referer: 'https://login.mgts.ru/amserver/UI/Login'
	}));
	if (!/logout/i.test(html)) {
		var errors = sumParam(html, null, null, /"auth-error-text"[^>]*>([^<]*)/ig);
		if (errors) throw new AnyBalance.Error(errors.join(' '));
		throw new AnyBalance.Error('Login failed, is site changed?');
	}
	var result = {
		success: true
	};
	getParam(html, result, 'fio', /"cabinet-aside"[^>]*>[^>]*<h3>((?:[^>]*>){6})/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Баланс:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /Лицевой счет:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
	//getParam(html, result, '__tariff', /Тарифный план:\s*<strong[^>]*>([^<]*?)\./i, replaceTagsAndSpaces);
	AnyBalance.setResult(result);
}