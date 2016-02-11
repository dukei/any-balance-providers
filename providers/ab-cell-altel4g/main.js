 /**
                                                                     Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
                                                                     */

 var g_headers = {
 	'Origin': 'https://cabinet.altel.kz',
 	'Referer': 'https://cabinet.altel.kz/',
 	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
 };

 function main() {
 	var prefs = AnyBalance.getPreferences();

 	AB.checkEmpty(prefs.login, 'Введите логин!');
 	AB.checkEmpty(prefs.password, 'Введите пароль!');

 	var baseurl = "https://cabinet.altel.kz/?lang=ru";
 	AnyBalance.setDefaultCharset('utf-8');

 	var html = AnyBalance.requestGet(baseurl + '', g_headers);

 	if (!html || AnyBalance.getLastStatusCode() > 400) {
 		AnyBalance.trace(html);
 		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
 	}


 	html = AnyBalance.requestPost(baseurl, {
 		form_login: prefs.login,
 		form_pass: prefs.password,
 		x: 81,
 		y: 18
 	}, g_headers);

 	if (!/logout=1/i.test(html)) {
 		var error = AB.getParam(html, null, null, /<ul[^>]+class="error"[^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
 		if (error) {
 			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
 		}


 		AnyBalance.trace(html);
 		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
 	}

 	var result = {
 		success: true
 	};

 	AB.getParam(html, result, 'fio', /"account-title"[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
 	AB.getParam(html, result, 'phone', /(?:Ваш номер|Сіздің нөміріңіз):([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
 	AB.getParam(html, result, '__tariff', /"plan-title"[^>]*>([^<]+)[^>]*>[^>]*plan-subtitle/i, AB.replaceTagsAndSpaces);
 	AB.getParam(html, result, 'balance', /"account-balance split"[\s\S]*?"split-title"[^>]*>([\s\S]*?)<\//i,
 		AB.replaceTagsAndSpaces, AB.parseBalance);
 	AB.getParam(html, result, 'bonus', /"bonus-balance split"[\s\S]*?"split-title"[^>]*>([\s\S]*?)<\//i,
 		AB.replaceTagsAndSpaces, AB.parseBalance);
 	AB.getParam(html, result, 'till', /бонусный счет[^>]*>\s*до([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDate);


 	var counters = AB.getElements(html, /<div[^>]+class="[^"]*?\bcounter[\s"]/ig);
    
    AnyBalance.trace('Found counters: ' + counters.length);
 	for (var i = 0; i < counters.length; ++i) {
 		var counter = counters[i];
        var value = getParam(counter, null, null, /<div[^>]+>([^<]+)(?=<span[^>]*?title)/i, replaceTagsAndSpaces);
        var units = AB.getElement(counter, /<span[^>]+?counter-title/i, replaceTagsAndSpaces);
 		var note = (AB.getElement(counter, /<div[^>]+?counter-note/i, replaceTagsAndSpaces) || '').split('\n');
 		var date = note[1] || note[0];
        note = note[0];
        var counter_name = null;
 		if (/Мин/i.test(units)) {
 			if (/Внутри сети|Желі ішінде/i.test(note))
 				counter_name = 'min_left'; // Минуты внутри сети
 			else if (/GSM/i.test(note))
 				counter_name = 'min_left_gsm'; // Минуты на GSM
 			else if (/на город/i.test(note))
 				counter_name = 'min_left_city'; // Минуты на город

 			if (counter_name && !/unlim/i.test(value))
 				AB.getParam(value, result, counter_name, null, null, parseMinutes);
 		} else if (/[МГКMGK][бb]/i.test(units)) {
 			// трафик
 			if (/с 08/i.test(counter))
 				counter_name = 'day_traffic_left';
 			else if (/с 00/i.test(counter))
 				counter_name = 'night_traffic_left';
 			else
 				counter_name = 'traffic_left';

 			if (counter_name)
 				AB.getParam(value, result, counter_name, null, null, parseTraffic);
 		} else if (/СМС|SMS/i.test(units)) {
 			// Смс внутри сети
 			counter_name = 'sms_left';
 			AB.getParam(value, result, counter_name, null, null, parseBalance);
 		}
 		if (!counter_name)
 			AnyBalance.trace('Неизвестная опция: ' + counter);
 		else
 			AB.getParam(date, result, counter_name + '_till', null, null, parseDateLocal);
 	}
    
    // start 2.02.2016
 	if (AnyBalance.isAvailable('additionalServices')) {
 		html = AnyBalance.requestGet('https://cabinet.altel.kz/additional-services', g_headers);

 		var
 			liArray = AB.sumParam(html, null, null, /<li[^>]*class="[^"]*active[^"]*"[^>]*>([\s\S]*?)<\/li>/gi),
 			pArray = [],
 			name,
 			price,
 			additionalServices = [];

 		for (var i = 0; i < liArray.length; i++) {
 			pArray = AB.sumParam(liArray[i], null, null, /<p[^>]*>([\s\S]*?)<\/p>/gi);
 			name = AB.getParam(pArray[0], null, null, null, AB.replaceTagsAndSpaces);
 			price = AB.getParam(pArray[1], null, null, null, AB.replaceTagsAndSpaces);
 			additionalServices.push(name + ' | ' + price);
 		}

 		AB.getParam(additionalServices.join('<br/>'), result, 'additionalServices');
 	}
 	// end 2.02.2016

 	AnyBalance.setResult(result);
 }

 function parseDateLocal(str) {
 	if (/До конца дня|Күннің соңына дейін/i.test(str)) {
 		var dt = new Date();
 		var today = new Date(dt.getYear(), dt.getMonth(), dt.getDate(), 23, 59, 59);
 		AnyBalance.trace('Parsed date ' + today + ' from ' + str);
 		return dt.getTime();
 	} else {
 		return parseDate(str);
 	}
 }
