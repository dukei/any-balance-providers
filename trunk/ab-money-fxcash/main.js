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
	var html;
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.fxcash.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	try {
		html = AnyBalance.requestPost(baseurl, {
			'login':prefs.login,
			'password':prefs.password,
			'auth':'1',
		}, addHeaders({Referer: baseurl}));
	} catch(e) {
		throw new AnyBalance.Error('Ошибка при запросе авторизации.');
	}
	if (/Имя пользователя или пароль введен неверно/i.test(html)) {
		throw new AnyBalance.Error('Имя пользователя или пароль введен неверно.');
	}

	var result = {success: true};

	result.__tariff = prefs.login;
	getParam(html, result, 'accessible', /Доступно: <b>(.*?)</, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Баланс: <b>(.*?)</, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Ваш бонус: <span .*?>(.*?)</, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}