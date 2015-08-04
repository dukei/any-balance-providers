/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Cache-Control':'max-age=0',
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Origin':'http://popunder.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36',
	'Accept-Language':'ru,en;q=0.8'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://popunder.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'main/auth/', g_headers);

	var cookieName = getParam(html, null, null, /\$\.cookie\(\s*'([^']*)/, replaceSlashes);
	var cookieValue = getParam(html, null, null, /\$\.cookie\(\s*'[^']*',\s*'([^']*)/, replaceSlashes);

	if(cookieName)
		AnyBalance.setCookie('.popunder.ru', cookieName, cookieValue);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'main/auth/', [
		['login', prefs.login],
		['pass', prefs.password],
		['x', '22'],
		['y', '12'],
		['authsubmit', 'Вход'],
    ], addHeaders({Referer: baseurl + 'main/auth/'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="pcb"[^>]*><h1>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'today', /Доход сегодня:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}