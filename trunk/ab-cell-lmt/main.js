/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru,en;q=0.8',
	'Cache-Control': 'max-age=0',
	'Connection':'keep-alive',
	'Origin':'https://mans.lmt.lv',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.101 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mans.lmt.lv/ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestGet('https://mans.lmt.lv/styles.css?_=1463', g_headers);
	
	html = AnyBalance.requestGet('https://mans.lmt.lv/auth_image.php?id=176831871', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl, [
		['where_login_form', 'manslmt'],
		['username', prefs.login],
		['password', prefs.password],
		['code', ''],
		['submit', 'login'],
		['login', 'Подключaйся!']
	], addHeaders({Referer: baseurl}));

	html = AnyBalance.requestGet(baseurl, g_headers);

	if (!/logout=true/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток на счету[^>]*>\s*<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тарифный план[^>]*>\s*<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}