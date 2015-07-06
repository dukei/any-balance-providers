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
	var baseurl = 'https://stat.mirgiga.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'cgi-bin/utm5/aaa5', {
		login: prefs.login,
		password: prefs.password,
		'cmd': 'login'
	}, addHeaders({Referer: baseurl + 'cgi-bin/utm5/aaa5'}));
	
	if (!/cmd=logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="in"[^>]*>[\s\S]*?([\s\S]*?)<h2>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|доступ запрещен/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс основного счета(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Полное имя(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Основной счет(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'credit', /Кредит основного счета(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Блокировка(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
    var href = getParam(html, null, null, /<SPAN[^>]+class="submenu-inact"[^>]*><A[^>]+href=\"([\s\S]*?)\"[^>]*>Тарифные планы<\/A>/i, replaceTagsAndSpaces, html_entity_decode);
	
    html = AnyBalance.requestGet(baseurl + 'cgi-bin/utm5/' + href, g_headers);
	
    getParam(html, result, '__tariff', /<TD[^>]*>Тарифный план<\/TD>(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);    

	AnyBalance.setResult(result);
}