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
	var baseurl = 'http://netstat.atnr.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверно указаны логин или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	getParam(html, result, 'status', /состояние интернета([\s\S]*?)<a[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);

	html = AnyBalance.requestGet(baseurl+'utm5/?module=41_services');
	getParam(html, result, 'currentTariff', /<table[^>]+class='utm-table'[^>]*>(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /<table[^>]+class='utm-table'[^>]*>(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cost', /<table[^>]+class='utm-table'[^>]*>(?:[\s\S]*?<td[^>]*>){14}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'writtenOff', /<table[^>]+class='utm-table'[^>]*>(?:[\s\S]*?<td[^>]*>){15}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	html=AnyBalance.requestGet(baseurl+'utm5/?module=user_details', g_headers);
	getParam(html, result, 'balance', /баланс(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /кредит(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /фио(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'accountID', /лицевой(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'adress', /адрес(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}