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
	var baseurl = 'https://info.fregat.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
/**	
	try {
		var html = AnyBalance.requestGet(baseurl + 'cgi-bin/stat.pl', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
**/	
	var html = AnyBalance.requestPost(baseurl + 'cgi-bin/stat.pl', {
		uu: prefs.login,
		pp: prefs.password,
	}, addHeaders({Referer: baseurl + 'cgi-bin/stat.pl'}));

	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Залишок на рахунку[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cost', /Зняття за поточний період[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cost_options', /Зняття за підключені опції[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'personal_code', /Ваш персональний платіжний код\s*(\d*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /П\.І\.Б\.(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);

	var href=getParam(html, null,null, /Список сервісів[\s\S]*?href='([^']*)/i);
	html= AnyBalance.requestGet(baseurl + href)
	getParam(html, result, '__tariff', /<table[\s\S]*?<td[\s\S]*?(<td[\s\S]*?td>)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}