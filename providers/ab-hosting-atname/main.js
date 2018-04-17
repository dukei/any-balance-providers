/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://atname.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/reg/login.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '/reg/login.php', {
		email: prefs.login,
		passwd: prefs.password,
		'login': 'Вход'
	}, addHeaders({
		Referer: baseurl + '/reg/login.php'
	}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="b-field__error-box"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Пользователь(?:[^>]*>){8}([\s\S]*?)<\/span/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /Пользователь(?:[^>]*>){4}([\s\S]*?)<\/span/i, replaceTagsAndSpaces);
	getParam(html, result, 'services', /Заказанных услуг(?:[^>]*>){2}[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'domens', /Заказанных доменов(?:[^>]*>){2}[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'domensRenew', /Домены требующие продления(?:[^>]*>){2}([\s\S]*?)из/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}