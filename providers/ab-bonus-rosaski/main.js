﻿
/**
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
	var baseurl = 'https://shop.rosaski.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+form_auth[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'USER_LOGIN') {
			return prefs.login;
		} else if (name == 'USER_PASSWORD') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'auth/?login=yes', params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getElement(html, /<[^>]+cwarn/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	var html = AnyBalance.requestGet(baseurl + 'personal/loyalty_programs/', g_headers);

	getParam(html, result, 'balance', /Всего:([^>]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Доступно для списания:([^>]*)/i, replaceTagsAndSpaces, parseBalance);

	var table = getParam(html, /История начислений[\s\S]*?(<table[\s\S]*?<\/table>)/i);
	
	getParam(table, result, 'last_date', /(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(table, result, 'last_sum', /(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'last_descr', /(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
