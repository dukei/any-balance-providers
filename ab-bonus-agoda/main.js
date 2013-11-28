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
	var baseurl = 'https://www.agoda.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'rewards/login.html', g_headers);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$ctl00$MainContent$ContentMain$RewardLogin1$txtEmail') 
			return prefs.login;
		else if (name == 'ctl00$ctl00$MainContent$ContentMain$RewardLogin1$txtPassword')
			return prefs.password;

		return value;
	});	

	html = AnyBalance.requestPost(baseurl + 'rewards/login.html', params, addHeaders({Referer: baseurl + 'rewards/login.html'}));

	if (!/sign out/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t login! Is the site is changed?');
	}
	html = AnyBalance.requestGet(baseurl + 'rewards/transactions.html', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />Available Points(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, [replaceTagsAndSpaces, /\D/, ''], parseBalance);

	AnyBalance.setResult(result);
}