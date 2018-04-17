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
	var baseurl = 'http://lkk.energosales.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var html = AnyBalance.requestGet(baseurl + 'lkk/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
        
	html = AnyBalance.requestPost(baseurl + 'lkk/login', {
		action: 'logon',
		login: prefs.login,
		pass: prefs.password
	}, addHeaders({Referer: baseurl + 'lkk/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /[^>]+class="err"[^>]*>[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Не верное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var span = getParam(html, null, null, /<span[^>]+class\s*=\s*"text_bi(?:[^>]*>){3}/i);
	
	getParam(span, result, 'balance', /[^>]*руб/i, [replaceTagsAndSpaces, /(.+)/, ((/задолженность/i.test(span) ? '-' : '') + '$1')], parseBalance);
	getParam(html, result, 'fines', /<span[^>]+class\s*=\s*"text_bi([^>]*>){6}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Потребитель:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Логин:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'device_number', /Номер прибора учета:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'last_counters', /Последние принятые показания:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}