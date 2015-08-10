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
	var baseurl = 'http://www.everbuying.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Please, enter login!');
	checkEmpty(prefs.password, 'Please, enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'm-users-a-sign.htm?ref=%2Fm-users.htm', g_headers);

	var validation = AnyBalance.requestPost(baseurl + 'm-users-a-act_sign.htm', {
		email: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'm-users-a-sign.htm?ref=%2Fm-users.htm', 'X-Requested-With':'XMLHttpRequest'}));
	
	if (!/Successfully/i.test(validation))
		throw new AnyBalance.Error(validation, null, /email\/password is incorrect/i.test(validation));

	html = AnyBalance.requestGet(baseurl + 'm-users.htm',
		addHeaders({Referer: baseurl + 'm-users-a-sign.htm?ref=%2Fm-users.htm'}));
	
	if (!/My Account/i.test(html))
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Unused EB Points[^>]+>\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balancecoupons', /Unused Coupons[^>]+>\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}