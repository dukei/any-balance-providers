/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mpay.mbank.kiev.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'uk/security/logon', {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl + 'uk/security/logon'}));
	
	if (!/btn-logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="[^"]*alert[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Недійсний логін чи пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var html = AnyBalance.requestGet(baseurl + 'uk/widgets/products/balance/data/UAH?_=' + new Date().getTime(), g_headers);
	var json = getJson(html);
	
	getParam(json.AccountsAvailableAmount/100, result, 'balance');
	
	AnyBalance.setResult(result);
}