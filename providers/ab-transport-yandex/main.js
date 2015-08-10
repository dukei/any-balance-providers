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
	var baseurl = 'http://m.yandex.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'traffic_level', /<[^>]*"traffic"(?:[^>]*>){4}\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	
	var units = getParam(html, null, null, [/<[^>]*"traffic"(?:[^>]*>){6}\s*([^<]+)/i, /<[^>]*"traffic"(?:[^>]*>){7}\s*([^<]+)/i], replaceTagsAndSpaces);
	var arrow = getParam(html, null, null, /<[^>]*"traffic"(?:[^>]*>){5}[^>]*"arr"[^>]*(http[^"]*)/i, replaceTagsAndSpaces);
	
	getParam((/down/i.test(arrow) ? '↓' : '↑') + ' ' + units, result, ['level_units', 'traffic_level']);
	
	AnyBalance.setResult(result);
}