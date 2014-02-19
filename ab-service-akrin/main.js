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
	var baseurl = 'https://www.akrin.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите фамилию!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'se/login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'se/login', {
		'_utf8':'☃',
		'lastName':prefs.login,
		'series':prefs.series,
		'number':prefs.number,
		'password':prefs.password,
		'x':'14',
		'y':'9'
	}, addHeaders({Referer: baseurl + 'se/login'}));
	
	if (!/>Выход</i.test(html)) {
		var error = getParam(html, null, null, /span class="label_value" style="color:red">([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не зарегистрирован в системе/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Вы вошли как([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс:([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}