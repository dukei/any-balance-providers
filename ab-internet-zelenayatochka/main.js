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
	var baseurl = 'https://personal.ooonet.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

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
	
	getParam(html, result, 'fio', /Мой счет[^>]*>\s*<table(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Мой счет[^>]*>\s*<table(?:[^>]*>){9}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', />([^<]*)(?:[^>]*>){12}Пополнить счет/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses', /\d+\s*бону/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred_balance', /Кредит счета(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}