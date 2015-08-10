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
	var baseurl = 'http://glopart.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/auth', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'dosignin', {
		j_username: prefs.login,
		j_password: prefs.password,
		'_spring_security_remember_me': 'off'
	}, addHeaders({Referer: baseurl + 'login/auth'}));
	
	if (!/logout\/index/i.test(html)) {
		var error = getParam(html, null, null, /(<h4>Внимание<\/h4>[\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /fullName:[^"']*["']*([^"']*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance_rur', /balance:[^}]*rur:([\s.\d]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_usd', /balance:[^}]*usd:([\s.\d]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}