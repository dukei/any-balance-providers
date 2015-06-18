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
	var baseurl = 'http://rkc-jkh.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.asp', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'access.asp', {
		'Search': prefs.login,
		'secondname': prefs.password,
	}, addHeaders({Referer: baseurl + 'login.asp'}));
	
	if (!/Добро пожаловать/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	// Задолженность на начало месяца
	getParam(html, result, 'balance', /Задолженность на конец месяца(?:[^>]*>){9}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// Плановое начисление
	getParam(html, result, 'plan', /Задолженность на конец месяца(?:[^>]*>){11}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// Перерасчеты
	getParam(html, result, 'pere', /Задолженность на конец месяца(?:[^>]*>){13}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// Фактическое начисление
	getParam(html, result, 'fakt', /Задолженность на конец месяца(?:[^>]*>){17}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// Поступления
	getParam(html, result, 'postup', /Задолженность на конец месяца(?:[^>]*>){19}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// Задолженность на конец месяца без учета пеней
	getParam(html, result, 'debt_end', /Задолженность на конец месяца(?:[^>]*>){21}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}