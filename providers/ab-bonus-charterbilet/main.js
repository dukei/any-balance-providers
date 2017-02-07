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
	var baseurl = 'http://www.charterbilet.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ajax/priv/login.php', {
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	if (!json.result) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неверный логин или пароль', null, true);
	}
	
	html = AnyBalance.requestGet(baseurl + 'priv/private.php?tab=deposit', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'charts', /span[^>]*>чартик([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', />рубль([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_usd', />доллар([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_eur', />евро([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}