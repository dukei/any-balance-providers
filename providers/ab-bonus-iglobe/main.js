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
	var baseurl = 'http://www.iglobe.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'travelmiles/info/service', g_headers);

	html = AnyBalance.requestPost(baseurl + 'cabinet_login?next=cabinet/booking', {
		usr: prefs.login,
		pwd: prefs.password,
		site_auth: 'sent',
		x: 0,
		y: 0
	}, addHeaders({Referer: 'http://www.iglobe.ru/cabinet_login?next=cabinet/booking'},
								{Origin: 'http://www.iglobe.ru'}));

	if (/Вход в личный кабинет/i.test(html)) {
		var error = 0
		throw new AnyBalance.Error(null, null, /Неверный логин или пароль/i.test(null));
	}
	else if (!/На счёте/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'travelmiles/info/service', g_headers);

	var result = {success: true};

	getParam(html, result, 'balance', /На счёте:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
