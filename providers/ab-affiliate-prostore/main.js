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
	var baseurl = 'https://prostorevprok.eps.lt/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Authorization/Login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var form = getElement(html, /<form[^>]+action="[^"]*Login[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'UserName') 
			return prefs.login;
		else if (name == 'Password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'Authorization/Login', params, addHeaders({Referer: baseurl + 'Authorization/Login'}));
    
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден|Неверный логин или пароль|данный номер карты отсутствует|пароль неправильный/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /id="Balance"(?:[\s\S]*?value=")([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /id="CardNo"(?:[\s\S]*?value=")([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /id="State"(?:[\s\S]*?value=")([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'group', /id="GroupName"(?:[\s\S]*?value=")([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}