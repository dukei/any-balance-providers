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
	var baseurl = 'https://newcabinet.yartv.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+login-form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name)) {
			return prefs.login;
		} else if (/password/i.test(name)) {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login', params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));
	
	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+form-block-error/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var token = getParam(html, /<input[^>]+value="([^"]*)[^>]+YII_CSRF_TOKEN/i, replaceHtmlEntities); 

	var result = {success: true}, json;

	getParam(html, result, 'account', /<span[^>]+account-data-item_link[^>]*>[\s\S]*?<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /data-name="([^"]*)/i, replaceHtmlEntities);

	if(AnyBalance.isAvailable('balance')){
		html = AnyBalance.requestPost(baseurl + 'payments/default/GetDataForMoneybagWidget', {YII_CSRF_TOKEN: token}, addHeaders({
			Accept: 'application/json, text/javascript, */*; q=0.01',
			'X-Requested-With': 'XMLHttpRequest',
			Referer: baseurl
		}));
		json = getJson(html);
		getParam('' + json.balance, result, 'balance', null, null, parseBalance);
	}
	
	AnyBalance.setResult(result);
}