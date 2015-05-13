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

function auth3(html, prefs) {
	var remote_addr = '212.46.225.78'; 
	var key = getParam(html, null, null, /var\s+key\s*=\s*['"]([^"']+)/i);
	
	var login = prefs.login;
	var password = hex_md5(prefs.password);
	var key_hash = hex_hmac_sha1(hex_hmac_sha1(login, password), key + remote_addr);
	var password = hex_hmac_sha1(password, login);
	return '?m=login2&l2=' + login + '&key=' + key_hash + '&password=' + password;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://billing-lan.net/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestGet(baseurl + auth3(html, prefs), g_headers);
	
	if (!/"Выход"/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + '?m=deposit', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс вашего лицевого счета(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Ваш статус:(?:[^>]*>)([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Текущий тариф:(?:[^>]*>)([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Номер договора:(?:[^>]*>)([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}