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
	var baseurl = 'https://stat.bit-com.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lk', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 500)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) { return value; });
    checkEmpty(params.form_build_id, 'Не удалось найти форму входа, сайт изменен?', true);
    
	html = AnyBalance.requestPost(baseurl + 'lk', {
		name: prefs.login,
		pass: prefs.password,
        form_build_id: params.form_build_id,
		form_id: 'user_login'
	}, addHeaders({Referer: baseurl + 'lk'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Сообщение об ошибке[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Итого:[\s\S]*?<td[^>]+lk-pay-balance[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lic_schet', /Лицевой сч[её]т:([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<div[^>]+lk_account__name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}