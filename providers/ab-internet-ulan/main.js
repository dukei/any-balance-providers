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
	var baseurl = 'https://stat.u-lan.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'auth/auth', {
		login: prefs.login,
		password: prefs.password,
		'auth': '1'
	}, addHeaders({Referer: baseurl + 'auth/auth'}));
	
	if (!/auth\/exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'account/info/', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток средств:[^>]*>([\s\d.,-]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'days', /(\d+)\s*дн(?:я|ей)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Лицевой счет №:[^>]*>\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /Окончание расчетного периода(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /Статус счета:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}