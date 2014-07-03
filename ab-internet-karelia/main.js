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
	var baseurl = 'https://karelia.pro/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'stats/auth.php', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'stats/auth.php', {
		contract: prefs.login,
		password: prefs.password,
		'login': 'Войти',
		'referer': '?module=info',
	}, addHeaders({Referer: baseurl + 'stats/auth.php', 'X-Requested-With':'XMLHttpRequest'}));
	
	if (!/Авторизация прошла успешно/i.test(html)) {
		var error = getParam(html, null, null, /class="error"(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Номер договора и\/или пароль заданы неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'stats/?module=info', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<td>Состояние счёта(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<td>Тариф(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /<td>Окончание тарифа(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseDateWord);
	
	AnyBalance.setResult(result);
}