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
	var baseurl = 'https://cash.vnu.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php?p=payment&pp=conn_friend', {
		username: prefs.login,
		passwd: prefs.password,
		do_login: 'do_login'
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		error = getParam(html, null, null, /Логин и пароль не соответствуют друг другу./i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Блокировка<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'credit', /Кредит<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /ФИО<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'accnum', /Номер лицевого счета<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тариф<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}