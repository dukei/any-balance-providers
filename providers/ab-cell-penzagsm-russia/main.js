/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	Referer: 'https://ioffice.penza-gsm.ru/login',
	'Accept-Charset': 'UTF-8,*;q=0.5',
	'Accept-Language': 'ru-RU',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.1'
};

function main() {
	var baseurl = "https://ioffice.penza-gsm.ru/abonent";
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if (prefs.login && (!/\d{11}/.test(prefs.login) && !/\d{6}/.test(prefs.login)))
		throw new AnyBalance.Error('Номер должен содержать 6 или 11 цифр');

	AnyBalance.setAuthentication(prefs.login, prefs.password);
	AnyBalance.setDefaultCharset('windows-1251');
	var html = AnyBalance.requestGet(baseurl, headers);

	if (!/>выход</i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sms_left', /SMS:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}