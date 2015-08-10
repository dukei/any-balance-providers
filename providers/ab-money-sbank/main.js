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
	var baseurl = 'https://online.sbank.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		var html = AnyBalance.requestGet('https://www.sbank.ru/Default.asp', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ifd/loginco.sbb', {
		username: prefs.login,
		password: prefs.password,
		'iehack': '☠'
	}, addHeaders({Referer: 'https://www.sbank.ru/Default.asp'}));
	
	if (!/>выйти из системы</i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	// Переходим на страницу карт
	html = AnyBalance.requestGet(baseurl + 'ifd/DetailsCards.sbb?AType=2', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток на счете(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'limit', />Лимит(?:[^>]*>){3}([^<(]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'debt', /Задолженность<(?:[^>]*>){3}([^<(]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'pay_limit', /Платежный лимит(?:[^>]*>){3}([^<(]*)/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'accnum', /№ счета(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardnum', /№ карты(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['currency', '__tariff'], /Валюта(?:[^>]*>){3}([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}