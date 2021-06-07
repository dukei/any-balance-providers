/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language':'en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.bloomberg.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'energy', g_headers);

	var result = {success: true};

	var table = getParam(html, /<h2[^>]*>\s*Crude Oil[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
	var re = new RegExp('('+(prefs.type || 'WTI')+'[\\s\\S]*?<\/a>[\\s\\S]*?)((<a class=)|(<\/tbody>))', 'i');
	var table= getParam(table, re);
	var result = {success: true};
	getParam(table, result, '__tariff',/([^"<]*)/,replaceTagsAndSpaces);
	getParam(table, result, 'currency',/(<span[\s\S]*?<\/span>)/,replaceTagsAndSpaces);
	getParam(table, result, 'balance',/(?:<span[\s\S]*?<\/span>[\s\S]*?)(<span[\s\S]*?<\/span>)/,replaceTagsAndSpaces,parseBalance);
	getParam(table, result, 'change',/(?:<span[\s\S]*?<\/span>[\s\S]*?){2,2}(<span[\s\S]*?<\/span>)/,replaceTagsAndSpaces,parseBalance);
	getParam(table, result, 'change_pcts',/(?:<span[\s\S]*?<\/span>[\s\S]*?){3,3}(<span[\s\S]*?<\/span>)/,replaceTagsAndSpaces,parseBalance);
	getParam(table, result, 'contract',/(?:<span[\s\S]*?<\/span>[\s\S]*?){4,4}(<span[\s\S]*?<\/span>)/,replaceTagsAndSpaces);
	getParam(table, result, 'contract_time',/(?:<span[\s\S]*?<\/span>[\s\S]*?){5,5}(<span[\s\S]*?<\/span>)/,replaceTagsAndSpaces);

	
    AnyBalance.setResult(result);
}