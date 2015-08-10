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
	var baseurl = 'https://my.dx.com/';
	var loginurl = 'https://passport.dx.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	AnyBalance.setExceptions(false);
	html = AnyBalance.requestPost(loginurl + '?redirect=http%3A%2F%2Fwww.dx.com', {
		'AccountName':prefs.login,
		'Password':prefs.password,
	}, addHeaders({Referer: loginurl + '?redirect=http%3A%2F%2Fwww.dx.com'}));
	AnyBalance.setExceptions(true);

	html = AnyBalance.requestGet(baseurl);

	if (!/My Orders/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}

	var result = {success: true};

	getParam(html, result, 'points', /DX Points:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'order_num', /<td class="number">[\s\S]*?<a.*?>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'order_date', /<td class="number">[\s\S]*?<td>[\s\S]*?(\d+\/\d+\/\d\d\d\d)<br/i, [replaceTagsAndSpaces, /(\d+)\/(\d+)/, "$2/$1"], parseDate);
	getParam(html, result, 'order_sum', /<td class="total">[\s\S]*?([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'order_status', /<td class="status">[\s\S]*?([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setExceptions(false);
	html = AnyBalance.requestGet('https://passport.dx.com/accounts/summaries.dx/logout.account', addHeaders({Referer: baseurl}));
	AnyBalance.setExceptions(true);

	AnyBalance.setResult(result);
}