/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Connection': 'keep-alive',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.107 Safari/537.36',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://user.astra-sever.ru';
	AnyBalance.setDefaultCharset('KOI8-R');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl, 'login=' + encodeURIComponent(prefs.login) + '&passwd=' + encodeURIComponent(prefs.password) + '&action=%F7%CF%CA%D4%C9', addHeaders({
		'Referer': 'https://user.astra-sever.ru/',
		'Cache-Control': 'max-age=0',
		'Origin': 'https://user.astra-sever.ru',
		'Content-Type':'application/x-www-form-urlencoded'
	}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /h3 align="center">([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + '/main.phtml', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'dogovor', /Договор([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', / ФИО([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние счета([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Текущий тариф:([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}