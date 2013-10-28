/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://www.avea.com.tr',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.avea.com.tr/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=onlineTransactionsHome&lang=en&tb=redTab', g_headers);

	var Xlogin = getParam(html, null,null, /value="5xxxxxxxxx"[^>]*([0-9a-f]{32})/i);
	var Xpass = getParam(html, null,null, /focusssPass[^>]*([0-9a-f]{32})/i);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if(name == Xlogin)
			return prefs.login;
		else if(name == Xpass)
			return prefs.password;		
		return value;
	});	
	html = AnyBalance.requestPost(baseurl + 'mps/portal?cmd=Login&lang=en', params, addHeaders({Referer: baseurl + 'mps/portal?cmd=Login&lang=en'}));
	html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=guncelKullanim&lang=tr&pagemenu=faturaislemleri.guncelfatura', g_headers);
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Login failed, is site changed?');
	}
    var result = {success: true};
	getParam(html, result, '__tariff', /Tariff:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<\s*b\s*>\s*G&uuml;ncel Fatura(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	var time = getParam(html, null, null, /Kalan S\&uuml;re:(?:[^>]*>){3}([^<]*)/i);

	sumParam(time, result, 'minutes', /kadar gecerli([^<]*?)DKniz/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'traf', /kadar gecerli([^<]*MB)/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'sms', /kadar gecerli([^<]*)SMS/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	
    AnyBalance.setResult(result);
}