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
	var baseurl = 'http://www.sberbank-am.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var dt = new Date();
	
	var html = AnyBalance.requestGet(baseurl + 'visible/chart/getCsv?fund=' + (prefs.fund || 2) + '&dateFrom=12&monthFrom=11&yearFrom=2013&dateTo=' + dt.getDate() + '&monthTo=' + (dt.getMonth()+1) + '&yearTo=' + dt.getFullYear(), g_headers);
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /^([\s\S]*?);;/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'pif_date', /(\d{2}-\d{2}-\d{2});\d+/i, [replaceTagsAndSpaces, /-/ig, '/'], html_entity_decode);
	getParam(html, result, 'balance', /\d{2}-\d{2}-\d{2};([\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'scha', /\d{2}-\d{2}-\d{2};[\d,.]+;([\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}