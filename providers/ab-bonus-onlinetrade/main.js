﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.onlinetrade.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'member/login.html', g_headers);
	var cE = getParam(html, /var\s+cE\s*=\s*['"]([^"']*)/);
	if(cE){
		AnyBalance.trace('Fooling stormwall');
		var cK = getParam(html, /var\s+cK\s*=\s*(\d+)/, null, parseBalance);
		var cookie = generateCookieValue(cK, cE);
		AnyBalance.trace('swp_token: ' + cookie);
		AnyBalance.setCookie('www.onlinetrade.ru', 'swp_token', cookie);
	}
	
	html = AnyBalance.requestGet(baseurl + 'member/login.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElements(html, [/<form/ig, /password/i])[0];
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		} else if (name == 'captcha') {
			var img = AnyBalance.requestGet(baseurl + 'captcha.php?mode=login', addHeaders({Referer: baseurl + 'member/login.html'}));
			return AnyBalance.retrieveCode('Пожалуйста, введите цифры с картинки', img, { inputType: 'number' });
		}

		return value;
	});
	
	
	html = AnyBalance.requestPost(baseurl + 'member/login.html', params, addHeaders({Referer: baseurl + 'member/login.html'}));
	
	if (!/memberEntered/i.test(html)) {
		var error = AB.getElement(html, /<[^>]+coloredMessage_red/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /неверный/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /ON-бонусов:([^>]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//AB.getParam(html, result, 'price', /Цена:([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'userId', /Клиентский номер[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status', /Статус:[\s\S]*?<span[^>]*>([\s\S]*?)(?:<a|<\/span)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'email', /E-mail:[\s\S]*?<span[^>]*>([\s\S]*?)(?:<a|<\/span)/i, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}