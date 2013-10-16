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
	var baseurl = 'http://www.bloomberg.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'markets/commodities/futures/metals/', g_headers);

	var result = {success: true};
	
	getParam(html, result, 'balance', new RegExp((prefs.type || 'COMEX') +' Silver(?:[^>]*>){4}([^<]*)', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'change', new RegExp((prefs.type || 'COMEX') +' Silver(?:[^>]*>){6}([^<]*)', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'change_pcts', new RegExp((prefs.type || 'COMEX') +' Silver(?:[^>]*>){8}([^<]*)', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contract', new RegExp((prefs.type || 'COMEX') +' Silver(?:[^>]*>){10}([^<]*)', 'i'), replaceTagsAndSpaces);
	getParam(html, result, 'contract_time', new RegExp((prefs.type || 'COMEX') +' Silver(?:[^>]*>){12}([^<]*)', 'i'), replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<h2>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}