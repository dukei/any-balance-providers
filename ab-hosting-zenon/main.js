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
	var baseurl = 'https://stat.zenon.net/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'c/zlogin', g_headers);

	html = AnyBalance.requestPost(baseurl + 'c/zlogin', {
		'rmodule': 'z',
		login: prefs.login,
		password: prefs.password,
		loginSubmit: 'войти'
	}, addHeaders({Referer: baseurl + 'c/zlogin'}));

	var src = getParam(html, null, null, /statp\?any=\d+&submitLocator=\+All\+/i);
	if(!src)
		throw new AnyBalance.Error('Не удалось найти страницу со статистикой. Сайт изменен?');

	html = AnyBalance.requestGet(AnyBalance.getLastUrl().replace(/\?[^]*/, '') + src, g_headers);

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /неправильный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс[^>]*>\s*(<td[^>]*>[^]+?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Номер договора[^>]*>\s*(<td[^>]*>[^]+?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}