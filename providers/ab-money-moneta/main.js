/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://moneta.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'welcome.htm', g_headers);
	

	html = AnyBalance.requestPost(baseurl + 'login', {
		target:'desktop',
		login:prefs.login,
		password:prefs.password,
    }, addHeaders({Referer: baseurl + 'welcome.htm'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'desktop.htm', g_headers);

    var result = {success: true};
	getParam(html, result, 'type', /Тип[^>]*>([^<:\(]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'rub_acc', /RUB(?:[^>]*>){12}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'rub_balance', /RUB(?:[^>]*>){16}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'usd_acc', /USD(?:[^>]*>){11}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'usd_balance', /USD(?:[^>]*>){15}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'eur_acc', /EUR(?:[^>]*>){11}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'eur_balance', /EUR(?:[^>]*>){15}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}