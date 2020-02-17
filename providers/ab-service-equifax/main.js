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
	var baseurl = 'https://online.equifax.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	var form = AB.getElement(html, /<form[^>]+login-form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, /Ошибка!([^<]*)/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /"userName"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<div[^>]+score-center[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}