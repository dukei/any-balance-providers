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
	var baseurl = 'https://www.iberia.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter IB Plus number!');
	checkEmpty(prefs.password, 'Enter PIN!');
	
	var html = AnyBalance.requestGet(baseurl + '/us/?language=en', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting provider site. Try to refresh later.');
	}

	var form = getElement(html, /<form[^>]+loginFormTop[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not find login form. Try to refresh later.');
	}

	var action = getParam(form, null, null, /action="([^"]*)/i, null, html_entity_decode);
	var lasturl = AnyBalance.getLastUrl();
	var url = joinUrl(lasturl, action);

	html = AnyBalance.requestPost(url + '?callback=jQuery19009373905938118696_1443763553894', {
		username: prefs.login,
		ajax: 'true'
	}, addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: lasturl}));

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(url, params, addHeaders({Referer: lasturl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+alert-with-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /password that you have entered is not correct/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*Your Avios([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', />\s*Hello([^]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);

	var div = getElements(html, [/<div[^>]+login-block[^>]*>/ig, /myProfileData/])[0];
	getParam(div, result, '__tariff', /<span[^>]*>([^]*?)<strong/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(prefs.login, result, 'num');

	if(AnyBalance.isAvailable('avios_left', 'flights_left', 'status_till')){
		var detailsurl = getParam(html, null, null, /<a[^>]+href="([^"]*)[^>]+title="Your Avios/i, null, html_entity_decode);
		detailsurl = joinUrl(AnyBalance.getLastUrl(), detailsurl);

		html = AnyBalance.requestGet(detailsurl, g_headers);
	 	getParam(html, result, 'avios_left', /you need to collect([^<]*)Elite Points/i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
	 	getParam(html, result, 'flights_left', /you need to collect[^<]*or([^<]*)Flights/i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
	 	getParam(html, result, 'status_till', /<span[^>]+date[^>]+fl-right[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
	}
	
	AnyBalance.setResult(result);
}