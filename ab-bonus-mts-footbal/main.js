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
	var baseurl = 'http://football.mts.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Auth/LoginPassword?returnUrl=http%3A%2F%2Ffootball.mts.ru%2F', g_headers);
	
	// var key = getParam(html, null, null, /File\/Captcha\?key=([^"]+)/i);
	// if(!key)
		// throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	
	// var captchaa;
	// if(AnyBalance.getLevel() >= 7) {
		// AnyBalance.trace('Пытаемся ввести капчу');
		// var captcha = AnyBalance.requestGet(baseurl + 'File/Captcha?key=' + key);
		// captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		// AnyBalance.trace('Капча получена: ' + captchaa);
	// } else {
		// throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	// }
	
	html = AnyBalance.requestPost(baseurl + 'Auth/LoginPassword?returnUrl=http%3A%2F%2Ffootball.mts.ru%2F', {
		Login:prefs.login,
		Password:prefs.password,
		// 'Key':key,
		// Value:captchaa,
	}, addHeaders({Referer: baseurl + 'Auth/LoginPassword?returnUrl=http%3A%2F%2Ffootball.mts.ru%2F'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /summary-errors[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'Profile/Balance', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'current', /Текущие прогнозы([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'checkin', /Чекины([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'wins', /Выигравшие прогнозы([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'banners', /Баннеров([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total', /Всего прогнозов([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balls', />Баллы([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'purchased', /Куплено призов([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balls_fan', /Баллов в ФАН Диван([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}