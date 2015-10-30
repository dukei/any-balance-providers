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
	var baseurl = 'http://volgaspot.ru/webmain/site/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		'LoginForm[username]': prefs.login,
		'LoginForm[password]': prefs.password,
		'yt0': 'Войти'
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		//var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		var error = getParam(html, null, null, /<input[^>]+?class="[^"]*\berror\b[^"]*"[^>]+?name="LoginForm\[username\]"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error('Неверный логин!', null, true);
		
		var error = getParam(html, null, null, /<input[^>]+?class="[^"]*\berror\b[^"]*"[^>]+?name="LoginForm\[password\]"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error('Неверный пароль!', null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	//http://regexr.com/
	//(?:\s+|<[^>]*>)*?
	getParam(html, result, '__tariff', 	/<th[^>]*>\s*Текущий\s+тарифный\s+план\s*<\/th>\s*<td[^>]*>\s*<a[^>]*>([\s\S]+?)<\/a>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', 	/<th[^>]*>\s*Лицевой\s+сч[её]т\s+№\s*<\/th>\s*<td[^>]*>([\s\S]+?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', 	/<th[^>]*>\s*Баланс\s*<\/th>\s*<td[^>]*>([\s\S]+?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'work_days', /<th[^>]*>\s*Осталось\s+дней\s*<\/th>\s*<td[^>]*>([\s\S]+?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', 	/<th[^>]*>\s*Кредит\s*<\/th>\s*<td[^>]*>([\s\S]+?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lock', 		/<th[^>]*>\s*Блокировка\s*<\/th>\s*<td[^>]*>([\s\S]+?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'access', 	/<th[^>]*>\s*Доступ\s+[вк]\s+интернет\s*<\/th>\s*<td[^>]*>([\s\S]+?)<\/td>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}