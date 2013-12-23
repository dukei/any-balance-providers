/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function authProc(prefs, baseurl) {
	
	var html = AnyBalance.requestPost(baseurl + 'enter.html', {
		'action': 'entering',
		login: prefs.login,
		pass: prefs.password,
	}, addHeaders({Referer: baseurl + 'enter.html'}));
	
	return html;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl1 = 'http://taxi-leader.ru/';
	var baseurl2 = 'http://sterl.rutaxi.ru/';
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl1 + 'enter.html', g_headers);

	html = authProc(prefs, baseurl1);
	var second = false;
	
	if (!/>\s*Просмотр\s*баланса\s*</i.test(html)) {
		// Вдруг это другой регион?
		html = authProc(prefs, baseurl2);
		second = true;		
	}

	if (!/>\s*Просмотр\s*баланса\s*</i.test(html)) {
		var error = getParam(html, null, null, /<font\s+color="#ff0000"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet((second ? baseurl2 : baseurl1) + 'enter.html?action=enteringbal', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'acc_num', /Номер счёта(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Номер счёта(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}