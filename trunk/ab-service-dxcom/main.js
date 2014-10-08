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
	var baseurl = 'https://m.dx.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + 'passport', addHeaders({Referer: baseurl}));

	https://m.dx.com/passport/?r=https%3A%2F%2Fm.dx.com%2Fmy
	
	html = AnyBalance.requestPost(baseurl + 'passport/?r=https%3A%2F%2Fm.dx.com%2Fmy', {
		'ReturnUrl':'https://m.dx.com/my',
		'username':prefs.login,
		'password':prefs.password,
	}, addHeaders({Referer: baseurl + 'accounts/login.dx'}));

	if (!/logout|выход/i.test(html)) {
		var error = sumParam(html, null, null, /<div>\s*<\s*span[^>]*color:Red[^>]*>([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error && /appears to be invalid/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'my/OrderList', addHeaders({Referer: baseurl + 'passport'}));

	var result = {success: true};
	
	// getParam(html, result, 'points', /DX Points:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	var firstTr = getParam(html, null, null, /<a href="\/my\/OrderDetail(?:[^>]+>){8,30}\s*<\/a>/i);
	if(firstTr) {
		getParam(firstTr, result, 'order_num', /OrderDetail\/(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(firstTr, result, 'order_date', /<em>([^<]+)<\/em>/i, replaceTagsAndSpaces, parseDate);
		getParam(firstTr, result, 'order_status', /<span>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		if(isAvailable('order_sum')) {
			var href = getParam(firstTr, null, null, /href="\/([^"]+)/i);
			if(href) {
				html = AnyBalance.requestGet(baseurl + href, addHeaders({Referer: baseurl + 'passport'}));
				getParam(html, result, 'order_sum', /Grand Total(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
			}
		}
	} else {
		AnyBalance.trace('Can`t find any order.');
	}
	
	AnyBalance.setResult(result);
}