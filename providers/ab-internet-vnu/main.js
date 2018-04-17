﻿/**
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
	var baseurl = 'https://cash.vnu.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
/*	//Вот козлы, они ж в нормальном режиме 500 возвращают
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
*/
	var captchaKey, captchaSrc, captcha;
	AnyBalance.trace('Пытаемся ввести капчу');
	captchaSrc = getParam(html, null, null, /kcaptcha\/\?PHPSESSID=[^"]+/i);
	captcha = AnyBalance.requestGet(baseurl + captchaSrc, addHeaders({ Referer: baseurl }));
	if(!captchaSrc || !captcha)
		throw new AnyBalance.Error('Не удалось получить капчу! Попробуйте обновить данные позже.');
	captchaKey = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
	AnyBalance.trace('Капча получена: ' + captchaKey);
	
	html = AnyBalance.requestPost(baseurl + 'index', {
		login: prefs.login,
		passwd: prefs.password,
		keystring: captchaKey
	}, addHeaders({Referer: baseurl}));
	
	if (/Авторизация не удалась./i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="cir yellow-tab"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'index', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс<\/th>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Блокировка<\/th>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'credit', /Кредит<\/th>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /ФИО<\/th>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'accnum', /id клиента<\/th>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /тарифный план<\/th>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}