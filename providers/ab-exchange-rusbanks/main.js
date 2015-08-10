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
	var baseurl = 'http://www.rusbanks.info/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'finance/atm/', g_headers);
	
	var result = {success: true};

	getParam(html, result, 'VISA_USD_BUY', /<td>VISA(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'VISA_USD_SELL', /<td>VISA(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'VISA_EUR_BUY', /<td>VISA(?:[^>]*>){15}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'VISA_EUR_SELL', /<td>VISA(?:[^>]*>){20}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'VISA_GBP_BUY', /<td>VISA(?:[^>]*>){25}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'VISA_GBP_SELL', /<td>VISA(?:[^>]*>){30}([^<]+)/i, replaceTagsAndSpaces, parseBalance);	
	getParam(html, result, 'VISA_CHF_BUY', /<td>VISA(?:[^>]*>){35}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'VISA_CHF_SELL', /<td>VISA(?:[^>]*>){40}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'MC_USD_BUY', /<td>MC(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'MC_USD_SELL', /<td>MC(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'MC_EUR_BUY', /<td>MC(?:[^>]*>){15}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'MC_EUR_SELL', /<td>MC(?:[^>]*>){20}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'MC_GBP_BUY', /<td>MC(?:[^>]*>){25}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'MC_GBP_SELL', /<td>MC(?:[^>]*>){30}([^<]+)/i, replaceTagsAndSpaces, parseBalance);	
	getParam(html, result, 'MC_CHF_BUY', /<td>MC(?:[^>]*>){35}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'MC_CHF_SELL', /<td>MC(?:[^>]*>){40}([^<]+)/i, replaceTagsAndSpaces, parseBalance);

	
	AnyBalance.setResult(result);
}