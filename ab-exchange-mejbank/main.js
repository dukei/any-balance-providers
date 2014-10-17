/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://minfin.com.ua/currency/mb/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'purchase_usd', /USD(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sell_usd', /USD(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	
	
	getParam(html, result, 'purchase_eur', /EUR(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){8}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sell_eur', /EUR(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){8}/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'purchase_rub', /RUB(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){12}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sell_rub', /RUB(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){12}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}