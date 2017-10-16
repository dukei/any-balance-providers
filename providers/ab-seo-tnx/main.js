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
	var baseurl = 'http://member.tnx.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = requestPostMultipart(baseurl + 'reguser.php', {
		login: prefs.login,
		password: prefs.password,
		'Submit3': 'Âîéòè'
	}, addHeaders({Referer: baseurl + 'reguser.php'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*errormessage[^]>*>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) {
            throw new AnyBalance.Error(error, null, /(?:неправильный\s+пароль|восстановить\s+логин)/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />([^<]+)(?:<[^<]*){3}рублей/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /ID в системе:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'kompany', /кампаний:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sites', /сайтов:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'reguser.php?mod=order_content');
    sumParam(html, result, 'zakazov', /Ваши текущие заказы[^<]*([\s\S]+?)</ig, replaceTagsAndSpaces, parseBalance, null, aggregate_sum);

    html = AnyBalance.requestGet(baseurl + 'reguser.php?mod=jobs_in_content');
    getParam(html, result, 'zadaniy', /Выполняемые[\s\S]*?<b>(\d+)<\/b>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}