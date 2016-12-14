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
	var baseurl = 'https://stats.domashka.net/';
	AnyBalance.setDefaultCharset('KOI8-R');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'process.php', {
		'dm_todo': 'do_auth',
		'dm_data[username]': prefs.login,
		'dm_data[password]': prefs.password
	}, addHeaders({Referer: baseurl + 'index.php'}));
	
	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Неверный логин или пароль или сайт изменен.');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /(?:Остаток на счету|Залишок на рахунку)[^<]*<font[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(prefs.login, result, 'licschet');
	getParam(html, result, 'deadline', /(?:Пакет будет продлен|Рестарт тарифного плану)[^<]*<font[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'abon', /(?:Абонентская плата|Абонентська плата)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}