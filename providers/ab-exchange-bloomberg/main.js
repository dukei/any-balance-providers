/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Cache-Control': 	'max-age=0',
	'User-Agent':		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
	'Accept-Language':	'en-US;q=0.8,en;q=0.7',
	'Connection':		'keep-alive',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.bloomberg.com/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.quote, 'Please, enter quote!');

	var html = AnyBalance.requestGet(baseurl + 'quote/' + prefs.quote, g_headers);
	
	var result = {success: true};
	//getParam(href, result, 'quote', /quote\/(.*)/i, null, html_entity_decode);

	AB.getParam(html, result, '__tariff',   /<h1[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'quote_show', /<h1[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);

	AB.getParam(html, result, 'balance', 							 /<span[^>]+"priceText[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['currency', 'balance', 'trending'], /<span[^>]+"currency[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces); 


	AB.getParam(html, result, 'trending', /<span[^>]+class="changeAbsolute[^>]*>(?:[\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance),
	AB.getParam(html, result, 'pcts', /<span[^>]+class="changePercent[^>]*>(?:[\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'open', 	    />\s*Open(?:[^>]*>){3}([\s\d.,-]+)/i,             AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'prev_close', />\s*Prev\s+Close(?:[^>]*>){3}([\s\d.,-]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'days_range', />\s*Day[^>]*Range[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,    [/<\/span>\s*<span[^>]*>/, '-', AB.replaceTagsAndSpaces]);
	AB.getParam(html, result, '52w_range',  />\s*52 week Range[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,    [/<\/span>\s*<span[^>]*>/, '-', AB.replaceTagsAndSpaces]);
//	AB.getParam(html, result, 'volume',     />\s*Volume(?:[^>]*>){3}([\s\d.,-]+)/i,           [/\D/g, ''],             AB.parseBalance);
	
    AnyBalance.setResult(result);
}