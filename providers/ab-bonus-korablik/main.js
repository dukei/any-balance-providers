﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.korablik.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', {
        email: prefs.login,
        pwd: prefs.password,
		'remember': '0',
		'captcha': '',
		'act': 'enter',
    }, addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'auth/login'
	}));
	
	var json = getJson(html);
	
	if (!json.status) {
		var error = json.errors.access;
		if (error)
			throw new AnyBalance.Error(error, null, /Неверные логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'detskaya/mycards', addHeaders({Referer: baseurl + 'detskaya/profile'}));

	var cardsBlock = getElement(html, /<div[^>]+class="jcarousel"[^>]*>/i);
	var cardBlocks = getElements(cardsBlock, /<li[^>]+row[^>]*>/ig);
	AnyBalance.trace('Найдено ' + cardBlocks.length + ' карт');

	if(!cardBlocks.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одной карты. Сайт изменен?');
	}
	
	for(var i = 0; i < cardBlocks.length; i++) {
		var cb = cardBlocks[i];
		getParam(cb, result, (i > 0) ? 'cardnum' + i : 'cardnum', /№\s*([^<]*)/i, replaceTagsAndSpaces);
		getParam(cb, result, (i > 0) ? 'cardbalance' + i : 'cardbalance', /Баланс:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	getParam(html, result, 'status_balance', /<span[^>]+statSum[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<span[^>]+statName[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}