﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://billing.mosinter.net/cp/login?uri=';
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl }));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>(?:[\s\S]*?[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин\/пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /баланс:(?:[^>]*>){1}([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, '__tariff', /Тарифный план:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'traffic', /трафик(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'agreementID', /ваш номер договора(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'deadline', /Услуги оплачены до(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'startDate', /Дата начала периода(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /<div[^>]*>Доступ в интернет(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}