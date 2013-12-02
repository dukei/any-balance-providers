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
	var baseurl = 'http://visionteam.mgx.me/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login.php', {
		'Submt': '0',
		cardNo: prefs.login,
		pin: prefs.password,
	}, addHeaders({Referer: baseurl + 'login.php'}));

	if (!/logoff/i.test(html)) {
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	var result = {success: true};
	
	var milesTypes = ['Initial', 'Status', 'Associated', 'Benefit', 'Family', 'Buying', 'Gratis', 'Total'];
	
	for(var i = 0; i < milesTypes.length; i++) {
		var Re = new RegExp(milesTypes[i]+'\\s*Miles(?:[^>]*>){2}[^>]*value="([^"]*)', 'i');
		getParam(html, result, 'balance'+milesTypes[i], Re, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}