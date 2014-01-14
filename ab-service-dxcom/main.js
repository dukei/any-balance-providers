/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	Origin:'http://m.dealextreme.com',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://m.dealextreme.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + 'accounts/login.dx', addHeaders({Referer: baseurl + ''}));

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$content$txtLoginEmail' || name == 'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$txtEmail') 
			return prefs.login;
		else if (name == 'ctl00$content$txtPassword' || name == 'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$txtPassword')
			return prefs.password;

		return value;
	});
	
	params['ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$btnLogin.x'] = 73;
	params['ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$btnLogin.y'] = 10;

	html = AnyBalance.requestPost(baseurl + 'accounts/login.dx', params, addHeaders({Referer: baseurl + 'accounts/login.dx'}));

	if (!/logout|выход/i.test(html)) {
		var error = sumParam(html, null, null, /<div>\s*<\s*span[^>]*color:Red[^>]*>([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error && /appears to be invalid/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'accounts/myorders.dx', addHeaders({Referer: baseurl + 'accounts'}));

	var result = {success: true};
	
	// getParam(html, result, 'points', /DX Points:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	var firstTr = getParam(html, null, null, /<tr>(?:[^>]+>){8,10}\s*<\/tr>/i);
	if(firstTr) {
		getParam(firstTr, result, 'order_num', /(?:[^>]+>){2}\s*(\d{10,})/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(firstTr, result, 'order_date', /(?:[^>]+>){5}([^<]+)/i, replaceTagsAndSpaces, parseDate);
		getParam(firstTr, result, 'order_status', /(?:[^>]+>){7}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		if(isAvailable('order_sum')) {
			var href = getParam(firstTr, null, null, /href="\/([^"]+)/i);
			if(href) {
				html = AnyBalance.requestGet(baseurl + href, addHeaders({Referer: baseurl + 'accounts'}));
				getParam(html, result, 'order_sum', /Grand Total:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
			}
		}
	} else {
		AnyBalance.trace('Can`t find any order.');
	}
	
	AnyBalance.setResult(result);
}