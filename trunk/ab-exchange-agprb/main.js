/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.agroprombank.com/xmlinformer.php';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
    var result = {success: true};
	getParam(html, result, '__tariff', /course[^>]*"official"[^>]*date="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'USD', /course[^>]*"official"[^>]*>[\s\S]*?USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'EUR', /course[^>]*"official"[^>]*>[\s\S]*?EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'MDL', /course[^>]*"official"[^>]*>[\s\S]*?MDL[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'UAH', /course[^>]*"official"[^>]*>[\s\S]*?UAH[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'RUB', /course[^>]*"official"[^>]*>[\s\S]*?RUB[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}