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
	var baseurl = 'https://lib.rus.ec/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'user/login', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'name') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'user/login', params, addHeaders({Referer: baseurl + 'user/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"messages error"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /имя пользователя или пароль неверны/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'user/me', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'days', />Абонемент(?:[^>]*>){2}осталось([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}