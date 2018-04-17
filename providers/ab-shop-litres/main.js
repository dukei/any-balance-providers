/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.litres.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'pages/login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'pages/login/', {
		'pre_action': 'login',
		'login': prefs.login,
		'pwd': prefs.password,
		'showpwd': 'on',
		'utc_offset_min': '180',
		'timestamp': new Date().getTime(),
	}, addHeaders({
		Referer: baseurl + 'pages/login/'
	}));
	
	if (!/logoff/i.test(html)) {
		var error = getParam(html, null, null, /alert\s*\(\s*["']([^"']*)/i, replaceSlashes);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<li[^>]+"cash"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонусов:[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(prefs.login, result, '__tariff');

	if(AnyBalance.isAvailable('books')){
		AnyBalance.trace('Считаем количество не спрятанных книг');

		html = AnyBalance.requestGet(baseurl + 'pages/my_books/', g_headers);
		var pages = getParam(html, /страниц:\s*\d+/i, replaceTagsAndSpaces, parseBalance);
		
		if(pages > 1){
			html = AnyBalance.requestGet(baseurl + 'pages/my_books/?pagenum=' + pages, g_headers);
		}

		var lastPageBooks = getElements(html, /<div[^>]+newbook/ig).length;

		getParam((pages-1)*12 + lastPageBooks, result, 'books');
	}
	
	AnyBalance.setResult(result);
}