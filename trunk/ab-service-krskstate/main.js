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
	var baseurl = 'http://www.krskstate.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите уникальный идентификатор заявления!');
	
	var html = AnyBalance.requestGet(baseurl + 'krao/underschool/queue?kinnumber='+prefs.login+'&search=%CF%EE%EA%E0%E7%E0%F2%FC', g_headers);
	
	if (/Информация не найдена/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию по номеру '+prefs.login+'. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Номер в очереди:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total', /Всего в очереди:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}