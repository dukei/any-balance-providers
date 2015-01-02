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

var g_regions = {
	'stavr': getStavr,
	'nal': getNal,
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	// По умолчанию ставрополь
	if(!prefs.region)
		prefs.region = 'stavr';
	
	AnyBalance.trace('Регион: ' + prefs.region);
	g_regions[prefs.region](prefs);
}

function getNal(prefs) {
	var baseurl = 'http://abonent.naltel.ru/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<p style='color:red'>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверно указаны логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred_balance', /Кредит(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function getStavr(prefs) {
	var baseurl = 'https://personal.ooonet.ru/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password,
		uri: '/',
		'submit':'Войти',
	}, addHeaders({Referer: baseurl}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<\/form>\s*<div[^>]*color\s*:\s*#cd0a0a[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин\/ЛС или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /<tr[^>]*>((?:[\s\S](?!<\/tr>))*).<\/tr>\s*<tr[^>]*>\s*<td[^>]*>\s*№ счета/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /№ счета([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<tr[^>]*>((?:[\s\S](?!<\/tr>))*?).<\/tr>\s*<tr[^>]*>(?:[\s\S](?!<\/tr>))*?refresh\/account/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'bonuses', /\d+\s*бону/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred_balance', /Рекомендуемая сумма к оплате:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}