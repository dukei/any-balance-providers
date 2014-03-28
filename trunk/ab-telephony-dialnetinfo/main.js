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
	var baseurl = 'http://www.dialnet.info/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '%D0%BB%D0%B8%D1%87%D0%BD%D1%8B%D0%B9-%D0%BA%D0%B0%D0%B1%D0%B8%D0%BD%D0%B5%D1%82/', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'reg/reg.php', {
		phone: prefs.login,
		pass: prefs.password,
		'ok': 'Войти'
	}, addHeaders({Referer: baseurl + '%D0%BB%D0%B8%D1%87%D0%BD%D1%8B%D0%B9-%D0%BA%D0%B0%D0%B1%D0%B8%D0%BD%D0%B5%D1%82/'}));
	
	if (!/Телефон дозвона/i.test(html)) {
		var error = getParam(html, null, null, /innerHTML[^"']*['"]([^"']*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Номер должен начинаться с 8 и содержать 11 цифр|Пароль не корректный/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'phone', /Телефон дозвона:([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'user_login', /Логин:([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'user_pass', /Пароль:([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'minutes', /Наработка:(?:[^>]*>){2}((?:[^>]*>){2}\s*мин)/i, replaceTagsAndSpaces, parseMinutes);
	getParam(html, result, 'traffic', /Наработка:(?:[^>]*>){4}((?:[^>]*>){2}\s*Мб)/i, replaceTagsAndSpaces, parseTraffic);
	
	AnyBalance.setResult(result);
}