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
	var baseurl = 'http://www.xe.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var table = getParam(html, null, null, /<table[^>]*id="xRatesBxTable"[\s\S]*?<\/table>/i);
	checkEmpty(table, 'Cant find currencys table', true);

    var result = {success: true};
	// USD
	getParam(table, result, 'EURUSD', /EUR,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'GBPUSD', /GBP,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'INRUSD', /INR,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'AUDUSD', /AUD,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'CADUSD', /CAD,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'ZARUSD', /ZAR,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'NZDUSD', /NZD,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'JPYUSD', /JPY,USD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	// EUR
	getParam(table, result, 'USDEUR', /USD,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'GBPEUR', /GBP,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'INREUR', /INR,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'AUDEUR', /AUD,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'CADEUR', /CAD,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'ZAREUR', /ZAR,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'NZDEUR', /NZD,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'JPYEUR', /JPY,EUR[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);	
	// GBP
	getParam(table, result, 'USDGBP', /USD,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'EURGBP', /EUR,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'INRGBP', /INR,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'AUDGBP', /AUD,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'CADGBP', /CAD,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'ZARGBP', /ZAR,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'NZDGBP', /NZD,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'JPYGBP', /JPY,GBP[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);		
    AnyBalance.setResult(result);
}