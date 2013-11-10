/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Reads the information from OZO.TV account (http://ozo.tv)
Author: valeravi (valeravi@vi-soft.com.ua)
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
	var baseurl = 'http://my.ozo.tv/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter the login!');
	checkEmpty(prefs.password, 'Enter the password!');

	page='tools/ajax.php'
	AnyBalance.trace('POST: ' + baseurl + page);
	html = AnyBalance.requestPost(baseurl + page, {
		fmt:'json',
		action:'cmdLogin',
		lng:'ru',
		login:prefs.login,
		pass:prefs.password,
		lang:'ru',
		referer:''
	}, addHeaders({
		"Accept": "application/json, text/javascript, */*; q=0.01",
		"Referer": baseurl + "?part=login&lang=ru&wmode=transparent",
		"Origin": "http://my.ozo.tv",
		"X-Requested-With": "XMLHttpRequest"
	}));
	AnyBalance.trace('POST: ' + baseurl + page + ' ... OK');
	
	var json = getJson(html);
	if(json == null || json.redirect == null || json.redirect == ""	|| json.error == null || json.error != ""
			|| (json.message != null && json.message.type == "error" )) {
		if (json != null && json.message != null) {
			error = json.message.text;
		}
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error("Can't login. Web site may changed or temporarily down.");
	}

	page='?part=subscriptions&lang=ru'
	AnyBalance.trace('GET: ' + baseurl + page);	
	html = AnyBalance.requestGet(baseurl + page, g_headers);
	AnyBalance.trace('GET: ' + baseurl + page + ' ... OK');	
	
	var result = {success: true};
	subs = html.match(/<tr>\s*<td>1<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td><[\s\S]*?><[\s\S]*?>([\s\S]*?)<\/span><\/span><\/td>\s*<\/tr>/i);
	if (subs == null || subs.length < 8 ) {
		AnyBalance.trace("Error: Can't parse: " + html);	
		throw new AnyBalance.Error("Can't parse web site response. Web site may changed or temporarily down.");
	}
	getParam(subs[1], result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(subs[2], result, 'duration', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(subs[3], result, 'cost', null, replaceTagsAndSpaces, parseBalance);
	getParam(subs[4], result, 'created', null, replaceTagsAndSpaces, parseDateISO);
	//subs[5] can be "автоматически" if subscription is just purchased and not used at least once. So 'activated' will be unavailable.
	getParam(subs[5], result, 'activated', null, replaceTagsAndSpaces, parseDateISO);
	getParam(subs[6], result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(subs[7], result, 'status', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['currency','cost'], /STR_AMOUNT-23[\s\S]*?\(([\s\S]*?)\)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}
