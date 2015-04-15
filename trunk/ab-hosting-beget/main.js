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
	var baseurl = 'https://cp.beget.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login_.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login_.php', {
		name: prefs.login,
		password: prefs.password,
		ssl: 'on',
		submit: ''
	}, addHeaders({Referer: baseurl + 'login_.php'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /некорректное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущий баланс<\/div>\s*<\/td>\s*<td[^>]*>([^]+?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'payment', /Суммарная стоимость услуг<\/div>\s*<\/td>\s*<td[^>]*>([^]+?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'daysleft', /Дата блокировки<\/div>\s*<\/td>\s*<td[^>]*>[^]+?(\d+ (?:дней|дня|день))\)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'disk', /Дисковое пространство<\/div>\s*<\/td>\s*<td[^>]*>[^]+?(\d+%)\)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}