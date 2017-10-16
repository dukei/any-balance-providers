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
	var baseurl = 'https://bonus.vtb24.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login = getParam(prefs.login, null, null, /^\d{10}$/i, [/^(\d{3})(\d{3})(\d{4})$/, '+7 ($1) $2-$3']), 'Введите номер телефона, 10 цифр подряд!' + (prefs.login ? ' Вы ввели: ' + prefs.login : ''));
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'account/login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	for(var i=0; i<5; ++i){
		html = AnyBalance.requestPost(baseurl + 'account/login', {
			Phone: prefs.login,
			Password: prefs.password,
			'ReturnUrl': ''
		}, addHeaders({Referer: baseurl + 'account/login'}));

		if(!/на нашем сервере произошла внутренняя ошибка/i.test(html))
			break;

		AnyBalance.trace('На сервере внутренняя ошибка. Ждем пару секунд и пробуем ' + (i+2) + '-й раз.');
		AnyBalance.sleep(2000);
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		if(/на нашем сервере произошла внутренняя ошибка/i.test(html))
			throw new AnyBalance.Error('Сервер бонусной программы временно неработспособен. Пожалуйста, попробуйте позже');

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(getElement(html, /<[^>]+user-block_text-bonuses/i), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<[^>]+user-block_text[^>]*>([\s\S]*?),/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}