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
	var baseurl = 'https://www.alpari.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/login/', g_headers);
	
	try {
		html = AnyBalance.requestPost(baseurl + 'ru/login/', {
			'successUrl':'https://new-my.alpari.ru/ru/',
			'login':prefs.login,
			'password':prefs.password,
			'forced':'1',
		}, addHeaders({Referer: baseurl + 'ru/login/'}));		
	} catch(e) {
	}
	
	html = AnyBalance.requestGet('https://new-my.alpari.ru/ru/', g_headers);
	
	if (!/>Выйти</i.test(html)) {
		var error = sumParam(html, null, null, /"tooltip__phrase"[^>]*>([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(html));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	var currencys = ['USD', 'EUR', 'RUR', 'GLD'];
	
	for(var i= 0; i < currencys.length; i++) {
		var current = currencys[i];
		
		getParam(html, result, 'balance_' + current, new RegExp('"[\\d,.\\s]+' + current + '"', 'i'), replaceTagsAndSpaces, parseBalance);
		getParam(current, result, 'currency_' + current);
	}
	
	AnyBalance.setResult(result);
}