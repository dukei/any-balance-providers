/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о бонусах для участников клуба Суперпокупателей от Comfy (http://club.comfy.ua/).

Сайт: http://comfy.ua/
Личный кабинет: http://club.comfy.ua/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = "http://club.comfy.ua/";
	AnyBalance.setDefaultCharset('utf-8'); 

	html = AnyBalance.requestPost(baseurl + 'auth/', {
		'data[pan]':prefs.login,
		'data[pass]':prefs.password
	}, addHeaders({
		'Accept-Encoding': 'gzip, deflate',
		'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
		'Referer': baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'X-Request': 'JSON'
	})); 

	if(html != '{"status":"ok","message":"registered"}'){
		throw new AnyBalance.Error('Не удалось пройти процедуру авторизации. Проверьте логин и пароль.');
	}

	html = AnyBalance.requestGet(baseurl + 'ru/cabinet'); 

	if(!/\/logout/i.test(html)){
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	getParam(html, result, '__tariff', /Карточка № <span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<div class="bonus_cout">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
