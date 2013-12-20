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
	var baseurl = 'https://mojtportal.me/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter your phone number!');
	checkEmpty(prefs.password, 'Enter your password!');
	
	var html = AnyBalance.requestGet(baseurl + '', g_headers);
	
	var params = createFormParams(html);
	
	params['ctl00$ctl00$ctl00$cmscontent$CmsMain$pArea1$ctl00$txtUser'] = prefs.login;
	params['ctl00$ctl00$ctl00$cmscontent$CmsMain$pArea1$ctl00$txtPass'] = prefs.password;
	params['ctl00$ctl00$ctl00$cmscontent$CmsMain$pArea1$ctl00$ddlPortal'] = '99';
	params['__EVENTTARGET'] = 'ctl00$ctl00$ctl00$cmscontent$CmsMain$pArea1$ctl00$lbtLogin';
	
	html = AnyBalance.requestPost(baseurl + 'default.aspx', params, addHeaders({Referer: baseurl }));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	var result = {success: true};
	getParam(html, result, 'phone', /Vaš broj:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Paket:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Trenutno stanje:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable(['traffic', 'traffic_till'])) {
		var href = getParam(html, null, null, /href\s*=\s*"\s*(https:\/\/www\.t-mobile\.me:2443[^"]*)/i);
		if(href) {
			html = AnyBalance.requestGet(href, g_headers);
			
			href = getParam(html, null, null, /href="([^"]*?)"(?:[^>]*?>){2}Mobilni Internet/i);
			html = AnyBalance.requestGet('https://www.t-mobile.me:2443' + href, g_headers);
			
			href = getParam(html, null, null, /href="([^"]*?)"(?:[^>]*?>){2}Provjera stanja/i);
			html = AnyBalance.requestGet('https://www.t-mobile.me:2443' + href, g_headers);
			
			getParam(html, result, 'traffic', /Mobilni Internet:([^<]*?)iz paketa/i, replaceTagsAndSpaces, parseTraffic);
			getParam(html, result, 'traffic_till', /aktivan do([^<]*)/i, replaceTagsAndSpaces, parseDate);
		} else {
			AnyBalance.trace('Can`t find link to the portal');
		}
	}
	
	AnyBalance.setResult(result);
}