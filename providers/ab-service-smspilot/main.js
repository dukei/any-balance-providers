﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://smspilot.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'my.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'my.php', {
		login_email:prefs.login,
		login_password:prefs.password
	}, addHeaders({Referer: baseurl + 'my.php'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден|Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<a[^>]+user_balance_str[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'agreement', /Договор №\s*<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'my-order.php', g_headers);
	getParam(html, result, '__tariff', /Текущий тариф\s*:([^<]*)/i, [replaceTagsAndSpaces, /\s*\|\s*$/, '']);
	
	AnyBalance.setResult(result);
}