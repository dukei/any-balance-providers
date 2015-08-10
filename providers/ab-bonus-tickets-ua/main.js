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
	var baseurl = 'https://my.tickets.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'bonuses', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'ru/login', {
		'user[email]': prefs.login,
		'user[pass]': prefs.password,
	}, addHeaders({Referer: baseurl + 'bonuses', 'x-requested-with':'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	if (!json.success) {
		var errors = [];
		for(var k in json.errors)
			errors.push(json.errors[k]);
		
		var error = errors.join(', ');
		if (error)
			throw new AnyBalance.Error(error, null, /Введите корректный имейл/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'bonuses', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'bonuses', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /"bonuses_quant"[^>]*>([\s\S]*?)грн\s*<\//i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl, g_headers);
	
	getParam(html, result, 'fio', /Здравствуйте,([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}