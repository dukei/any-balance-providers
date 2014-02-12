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
	var baseurl = 'http://lk.ykstolica.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'billing/personal/', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'USER_LOGIN') 
			return prefs.login;
		else if (name == 'USER_PASSWORD')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'billing/personal/', params, addHeaders({Referer: baseurl + 'billing/personal/'}));
	
	if (!/logout/i.test(html)) {
		/*var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		*/
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'account', /Лицевой счет:[^>]*>\s*л.с([^<]+№\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Личный[^>]*>\s*кабинет([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /((?:Задолженность|Переплата)\s*:[\s\S]*?)<\/tr/i, [replaceTagsAndSpaces, /([\d.,]+)\s*руб\.?\s*([\d.,]+)\s*коп\.?/i, '$1.$2', /Задолженность\s*:/i, '-'], parseBalance);
	
	var array = sumParam(html, null, null, /<tr>\s*<td>((?:[^>]*>){6})\s*<\/td>/ig, replaceTagsAndSpaces);
	if(array) getParam(array.join('\n'), result, 'all');
	else AnyBalance.trace('Не удалось найти услуги, сайт изменен?');
	
	AnyBalance.setResult(result);
}