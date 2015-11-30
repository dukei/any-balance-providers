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
	var baseurl = 'https://my.novus.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	

	var html = AnyBalance.requestGet(baseurl+'login', g_headers);
		
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$cphMain$txtLogin')
			return prefs.login;
		else if (name == 'ctl00$cphMain$txtPass')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl+'login', params, addHeaders({Referer: baseurl+'login'}));


	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+id="ctl00_cphMain_lblError"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Невірний номер картки чи пароль!/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'status', /Статус([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс за карткою([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Бонуси діють([^>]*>){1}/i, replaceTagsAndSpaces, parseDate);

	AnyBalance.setResult(result);
}