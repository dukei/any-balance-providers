﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':  'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 	   'keep-alive',
	'User-Agent': 	   'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://sis.nesk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl, {
		login: 	prefs.login,
		pass: 	prefs.password
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="error_msg"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин и\/или пароль/i.test(error));
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	AB.getParam(html, result, 'balance', 		  /(?:Задолженность|Переплата)(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'peny', 	  		  /Пени(?:[^>]*>){2}([^<]*)/i, 								AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'account', 		  /Номер лицевого счёта(?:[^>]*>){2}([\s\S]*?)<\//i, 		AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'counter_number',   /Счётчик(?:[\s\S]*?)Номер(?:[^>]*>){2}([\s\S]*?)<\//i, 	AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'counter_install',  /Дата установки(?:[^>]*>){2}([\s\S]*?)<\//i, 				AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, '__tariff', 		  /Наименование(?:[^>]*>){2}([\s\S]*?)<\//i, 				AB.replaceTagsAndSpaces);

	AB.getParam(html, result, 'last_counter_date',   /Последние показания принятые к расчёту(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, 		      AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'last_counter_value',  /Последние показания принятые к расчёту[\s\S]*?Показания(?:[^>]*>){2}([^<]*)/i, 	  AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'last_counter_day',    /Последние показания принятые к расчёту(?:[\s\S]*?)день(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'last_counter_night',  /Последние показания принятые к расчёту(?:[\s\S]*?)ночь(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'unaccounted_payment', /Неразнесённые платежи(?:[\s\S]*?)Сумма оплаты(?:[^>]*>){2}([\s\S]*?)<\//i, 		  AB.replaceTagsAndSpaces, AB.parseBalance);
	
	AnyBalance.setResult(result);
}