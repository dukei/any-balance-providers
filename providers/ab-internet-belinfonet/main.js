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
	var baseurl = 'https://www.adsl.by/';
	AnyBalance.setDefaultCharset('CP1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '001.htm', addHeaders({
		Authorization: 'Basic ' + Base64.encode(prefs.login + ':' + prefs.password)
	}));
	
	if (!/logout/i.test(html)) {
		if(AnyBalance.getLastStatusCode() === 401)
			throw new AnyBalance.Error('Неверный логин или пароль', null, true);

		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'accnum', /Ваш аккаунт,([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traffLeft', /<td[^>]*>Осталось трафика на сумму(?:[^>]+>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'timeLeft', /<td[^>]*>осталось\s*<b>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /<td[^>]*>Аккаунт(?:[^>]+>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'price', /<td[^>]*>Стоимость пакета и доп\. услуг(?:[^>]+>){3}([^<]+)/i, [replaceTagsAndSpaces, /([^=]+)/i, ''], parseBalance);
	
	AnyBalance.setResult(result);
}