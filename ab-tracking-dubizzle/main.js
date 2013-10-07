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
	// abudhabi is defaualt
	var baseurl = 'http://'+(prefs.region ? prefs.region : 'uae') +'.dubizzle.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'search/?keywords=' + encodeURIComponent(prefs.kword) + '&is_basic_search_widget=1&is_search=1', g_headers);
	
    var result = {success: true};
	getParam(html, result, 'balance', /class="group-header"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	var firstAdv = getParam(html, null, null, /(<div[^>]*class="item"(?:[\s\S]*?<\/div){12})/i);
	checkEmpty(firstAdv, 'Can`t find any item with key word ' + prefs.kword, true);
	
	getParam(firstAdv, result, 'adv_price', /class="price"[^>]*>([^<]*)/i, [/\D/g, ''], parseBalance);
	getParam(firstAdv, result, 'adv_title', /class="title"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(firstAdv, result, 'adv_category', /class="breadcrumbs"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(firstAdv, result, 'adv_date', /class="date"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(firstAdv, result, 'adv_location', /class="location"[^>]*>\s*Located\s*:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(firstAdv, result, 'adv_age', /class="features"[^>]*>[\s\S]*?Age:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(firstAdv, result, 'adv_usage', /class="features"[^>]*>[\s\S]*?Usage:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(firstAdv, result, 'adv_condition', /class="features"[^>]*>[\s\S]*?Condition:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}