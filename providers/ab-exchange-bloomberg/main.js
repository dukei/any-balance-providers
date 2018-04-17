/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Cache-Control': 	'max-age=0',
	'User-Agent':		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
	'Accept-Language':	'ru,en;q=0.8',
	'Connection':		'keep-alive',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.bloomberg.com/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.quote, 'Please, enter quote!');

	var html = AnyBalance.requestGet(baseurl + 'quote/' + prefs.quote, g_headers);
	
	var header = getElement(html, /<div[^>]*class="basic-quote"[^>]*>/i);
	if(!header) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Please check entered quote. The quote header ' + prefs.quote + ' has not been found!');
	}
	
	var result = {success: true};
	//getParam(href, result, 'quote', /quote\/(.*)/i, null, html_entity_decode);

	AB.getParam(header, result, '__tariff',   /<h1[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(header, result, 'quote_show', /<h1[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);

	AB.getParam(header, result, 'balance', 							 /class\s*=\s*"price"[^>]*>([\s\d.,]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(header, result, ['currency', 'balance', 'trending'], /class\s*=\s*"currency"[^>]*>([^<]+)/i);


	var trending = AB.getParam(header, null, null, /<div[^>]+class="change-container"[^>]*>(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance),
		pcts     = AB.getParam(header, null, null, /<div[^>]+class="change-container"[^>]*>(?:[\s\S]*?<div[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	if(!/price-container up/i.test(header)) {
		result.trending 	 = trending * (-1);
		result.trending_pcts = pcts 	* (-1);
	} else {
		result.trending 	 = trending;
		result.trending_pcts = pcts;
	}

	AB.getParam(html, result, 'open', 	    />\s*Open(?:[^>]*>){2}([\s\d.,-]+)/i,             AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'prev_close', />\s*Previous\s+Close(?:[^>]*>){2}([\s\d.,-]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'days_range', />\s*Day[^>]*Range(?:[^>]*>){2}([\s\d.,-]+)/i,    AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '52w_range',  />\s*52wk Range(?:[^>]*>){2}([\s\d.,-]+)/i,       AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'volume',     />\s*Volume(?:[^>]*>){2}([\s\d.,-]+)/i,           [/\D/g, ''],             AB.parseBalance);
	
    AnyBalance.setResult(result);
}