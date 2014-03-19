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
	var baseurl = 'https://bill.helios-net.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'bill/login.phtml', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'bill/login.phtml', {
		username: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'bill/login.phtml'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Ошибка:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /unknown username or invalid password/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'account', /Номер лицевого счета([^>]*>){16}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Остаток средств([^>]*>){17}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус([^>]*>){17}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}