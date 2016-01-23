/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://stat.k-telecom.org/';
	AnyBalance.setDefaultCharset('KOI8-R');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cgi-bin/proga/client.pl', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	html = AnyBalance.requestPost(baseurl+'cgi-bin/proga/client.pl', {
		do_login: 1,
		login: prefs.login,
		pass: prefs.password
	});

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<h4[^>]+style='color:red;text-align:center;'[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /Указан неправильный (пароль|логин)/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Абонент(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Состояние(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'access', /Доступ(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'agreement', /N Договора(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /тариф(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}