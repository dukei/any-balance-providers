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
	var baseurl = 'http://mozayka.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '!processing/login.php?cardNum='+encodeURIComponent(prefs.login)+'&cardPin='+encodeURIComponent(prefs.password), g_headers);
	
	if (!/"success":"2"/i.test(html)) {
		var error = getParam(html, null, null, /error"\s*:\s*"([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '!processing/bill.php', g_headers);
	var json = getJson(html);
	if(!json)
		throw new AnyBalance.Error('Не удалось найти информацию, сайт изменился?');
	
	getParam(json.buyer.activeBalance+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.buyer.cards+'', result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}