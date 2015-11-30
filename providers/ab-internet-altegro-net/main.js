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
	var baseurl = 'http://lk.altegronet.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'personal_account')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'users/login', params, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="noty_message"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	getParam(html, result, 'balance', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<a[^>]+class="orange_link"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'accountNumber', /<div[^>]+class="info"[^>]*>(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'currentTariff', /<div[^>]+class="info"[^>]*>(?:[\s\S]*?<span[^>]*>){5}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'writeOffs', /<div[^>]+class="row statistics"[^>]*>(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'trafficIn', /<p[^>]+incoming_traffic"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'traffucOut', /<p[^>]+outbound_traffic"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.setResult(result);
}