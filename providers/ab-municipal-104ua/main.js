﻿
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://104.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'ru/cabinet/', g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'ru/cabinet/login_check', {
			'_type': 'individual',
			'_username': prefs.login,
			'_password': prefs.password,
			'_target_path': '',
			'_target_path_individual': '/ru/cabinet',
			'_target_path_legal': '/ru/business-online',
			'_remember_me': 1
	}, AB.addHeaders({
		    Referer: baseurl
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /title error[^>]*>((?:[^>]*>){2})/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /(?:логін|пароль)/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    html = AnyBalance.requestGet(baseurl + 'ru/cabinet/info', g_headers);

	var result = {success: true};


	AB.getParam(html, 	 result, 'full_name', 		/cabinet-title[\s\S]*?<span[^>]*>([^/]+)/i, 	  	 AB.replaceTagsAndSpaces);
	AB.getParam(html, 	 result, 'account_number',  /cabinet-title[\s\S]*?лицевой счет([^/]+)/i, 	  	 AB.replaceTagsAndSpaces);
	AB.getParam(html, 	 result, 'address', 		/cabinet-stats[\s\S]*?b-text[\s\S]*?<p>([^<]+)/i, 	 AB.replaceTagsAndSpaces);
	AB.getParam(html, 	 result, 'email', 			/cabinet-stats[\s\S]*?propEmail[^>]*>([^<]+)/i,   	 AB.replaceTagsAndSpaces);
	//AB.getParam(html, result, 'agreement', /cabinet-title[\s\S]*?договор([^<]+)/i, AB.replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'ru/cabinet/consumers-book', g_headers);
	var balance_div = getParam(html, null, null, /<div[^>]*g-col-right[^>]*>[\s\S]*?<div[^>]*b-top[^>]*>([\s\S]*?)<\/div>/i),
		balance  	= /Задолженность/i.test(balance_div) ? '-' + getParam(balance_div, null, null, /<p>([\s\S]*?)<\/p>/i) : getParam(balance_div, null, null, /<p>([\s\S]*?)<\/p>/i);
	AB.getParam(balance, result, 'balance',   		 null, 												 AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
