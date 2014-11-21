/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.life.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.phone, 'Введите номер телефона!');
	checkEmpty(prefs.pass, 'Введите пароль!');
	
	if(prefs.type == 'site') {
		mainSite(prefs, baseurl);
	} else {
		mainMobileApp(prefs, baseurl);
	}
}

function parseSec(str) {
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if (matches) {
        time = (+matches[1]) * 3600 + (+matches[2]) * 60 + (+matches[3]);
        AnyBalance.trace('Parsing minutes ' + time + ' from value: ' + str);
        return time;
    }
    AnyBalance.trace('Could not parse minutes from value: ' + str);
}

function parseBalanceSecLeft(str) {
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if (matches) {
        time = (+matches[1]) * 3600 + (+matches[2]) * 60 + (+matches[3]);
        AnyBalance.trace('Parsing minutes ' + time + ' from value: ' + str);
	time = 180000 - time;
        return time;
    }
    AnyBalance.trace('Could not parse minutes from value: ' + str);
}

function mainSite(prefs, baseurl) {
	var html = AnyBalance.requestGet(baseurl + 'ru/?locale=ru', g_headers);
	var lang = prefs.lang || 'ru';

	if(AnyBalance.getLastStatusCode() > 400 || !html)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'msisdn') 
			return prefs.phone;
		else if (name == 'super_password')
			return prefs.pass;

		else if (name == 'msisdn_code')
			return prefs.prefph;			
			
		return value;
	});

	// Если показывают картинку - надо запросить капчу
	var href = getParam(html, null, null, /<img src="\/(captcha\/image[^"]+)/i);
	if(href) {
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl + href);
			params.captcha_1 = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + params.captcha_1);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
	}

	html = AnyBalance.requestPost(baseurl + 'ru/?locale=ru', params, addHeaders({Referer: baseurl + 'ru/?locale=ru'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="errorlist">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestPost(baseurl + 'ru/osnovnaya-informaciya/osnobnaya-informaciya/', params, addHeaders({Referer: baseurl + 'ru/osnovnaya-informaciya/osnobnaya-informaciya/'}));
        // Основной счет
	getParam(html, result, 'Mbalance', /<td>Основной счет:(?:[\s\S]*?<td[^>]*>){5}\s*([\s\d.,\-]+)/i, replaceTagsAndSpaces, parseBalance);
        // Бонусный счет
	getParam(html, result, 'Bbalance', />Бонусный счет(?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/i, replaceTagsAndSpaces, parseBalance);
	//Минуты по сети Life:)
    	sumParam(html, result, 'mins_life', /минуты \[сеть <span class="life">life:\)<\/span>](?:[\s\S]*?<td[^>]*>){1}\s*([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseSec, aggregate_sum);
    	//Минуты по сети Life:) тариф Life 25
    	sumParam(html, result, 'mins_life', /25 - 3000 мин.(?:[\s\S]*?<td[^>]*>){1}\s*([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalanceSecLeft, aggregate_sum);
	//Подарочный трафик (Бесплатный Интернет [Интернет, WAP]: CMS и Бесплатный Интернет)
    	sumParam(html, result, 'gprs', /Интернет(?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//MMS по Life
    	sumParam(html, result, 'mms_life', /MMS \[сеть <span class="life">life:\)<\/span>](?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//SMS по Life
    	sumParam(html, result, 'sms_life', /SMS \[сеть <span class="life">life:\)<\/span>](?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//MMS по Украине
    	sumParam(html, result, 'mms_uk', /MMS \[в пределах Украины\](?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//SMS по Украине
    	sumParam(html, result, 'sms_uk', /SMS \[в пределах Украины\](?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Срок действия
	getParam(html, result, 'till', />Срок действия номера(?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/i, replaceTagsAndSpaces, parseDateISO);
	// Телефон
	getParam(html, result, 'phone', /class="user-number"[^>]*>(380\d+)/i, [replaceTagsAndSpaces, /^380/, '+380'], html_entity_decode);
        // Тариф
	if(lang == 'ru') {
	  html = AnyBalance.requestPost(baseurl + 'ru/osnovnaya-informaciya/osnobnaya-informaciya/', params, addHeaders({Referer: baseurl + 'ru/osnovnaya-informaciya/osnobnaya-informaciya/'}));
	  getParam(html, result, '__tariff', /<td>Тариф:(?:[\s\S]*?<td[^>]*>){5}\s*([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	}
	if(lang == 'uk') {
	  html = AnyBalance.requestPost(baseurl + 'uk/osnovna-informacia/osnovna-informacia/', params, addHeaders({Referer: baseurl + 'uk/osnovna-informacia/osnovna-informacia/'}));
	  getParam(html, result, '__tariff', /<td>Тариф:(?:[\s\S]*?<td[^>]*>){5}\s*([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	}
	if(lang == 'en') {
	  html = AnyBalance.requestPost(baseurl + 'en/general-info/general-info/', params, addHeaders({Referer: baseurl + 'en/general-info/general-info/'}));
	  getParam(html, result, '__tariff', /<td>Tariff:(?:[\s\S]*?<td[^>]*>){5}\s*([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	}


	AnyBalance.setResult(result);
}

function parseBalanceLeft(str) {
	var val = parseBalance(str);
	if (isset(val)) {
		val = 180000 + val; //По условиям тарифного плана Life 25 и Свободный Life западный
	}
	return val;
}

function parseTrafficMbLeftIK(str) {
	var val = parseTrafficMb(str);
	if (isset(val)) {
		val = 50 + val; //По условиям Интернета за копейку для Востока
	}
	return val;
}

function parseTrafficMbLeftIE(str) {
	var val = parseTrafficMb(str);
	if (isset(val)) {
		val = 30 + val; //По условиям Интернет + Россия для Востока
	}
	return val;
}

function createParams(params) {
	var str = '';
	for (var param in params) {
		str += str ? '&' : '?';
		str += encodeURIComponent(param);
		str += '=';
		str += encodeURIComponent(params[param]);
	}
	return str;
}

function createSignedUrl(method, params) {
	var str = createParams(params);
	str = method + str + '&signature=';
	var hash = CryptoJS.HmacSHA1(str, "E6j_$4UnR_)0b");
	hash = hash.toString(CryptoJS.enc.Base64);
	str += encodeURIComponent(hash);
	return 'https://api.life.com.ua/mobile/' + str;
}

var g_errors = {
	SUCCESSFULY_PERFORMED: 0,
	METHOD_INVOCATION_TIMEOUT: -1,
	INTERNAL_ERROR: -2,
	INVALID_PARAMETERS_LIST: -3,
	VENDOR_AUTHORIZATION_FAILED: -4,
	VENDOR_ACCESS_KEY_EXPIRED: -5,
	VENDOR_AUTHENTICATION_FAILED: -6,
	SUPERPASS_CHECKING_FAILED: -7,
	INCORRECT_SUBSCRIBER_ID: -8,
	INCORRECT_SUBSRIBER_STATE: -9,
	SUPERPASS_BLOCKED: -10,
	SUBSCRIBER_ID_NOT_FOUND: -11,
	TOKEN_EXPIRED: -12,
	CHANGE_TARIFF_FAILED: -13,
	SERVICE_ACTIVATION_FAILED: -14,
	OFFER_ACTIVATION_FAILED: -15,
	GET_TARIFFS_FAILED: -16,
	GET_SERVICES_FAILED: -17,
	REMOVE_SERVICE_FROM_PREPROCESSING_FAILED: -18,
	LOGIC_IS_BLOCKING: -19,
	TOO_MANY_REQUESTS: -20,
	PAYMENTS_OR_EXPENSES_MISSED: -40,
	INTERNAL_APPLICATION_ERROR: 0x80000000
};

var g_errorDescription = {};
g_errorDescription[g_errors.SUCCESSFULY_PERFORMED] = "Успешное выполнение запроса";
g_errorDescription[g_errors.METHOD_INVOCATION_TIMEOUT] = "Вызываемый метод не ответил за разумное время";
g_errorDescription[g_errors.INTERNAL_ERROR] = "Внутренняя ошибка";
g_errorDescription[g_errors.INVALID_PARAMETERS_LIST] = "Один из обязательных параметров отсутствует или задан неверно.";
g_errorDescription[g_errors.VENDOR_AUTHORIZATION_FAILED] = "Авторизация не удалась";
g_errorDescription[g_errors.VENDOR_ACCESS_KEY_EXPIRED] = "Ключ доступа устарел";
g_errorDescription[g_errors.VENDOR_AUTHENTICATION_FAILED] = "Аутентификация не удалась";
g_errorDescription[g_errors.SUPERPASS_CHECKING_FAILED] = "Неправильный суперпароль";
g_errorDescription[g_errors.INCORRECT_SUBSCRIBER_ID] = "Неправильный идентификатор пользователя";
g_errorDescription[g_errors.INCORRECT_SUBSRIBER_STATE] = "Неправильный статус пользователя";
g_errorDescription[g_errors.SUPERPASS_BLOCKED] = "Суперпароль заблокирован. Получите новый суперпароль.";
g_errorDescription[g_errors.SUBSCRIBER_ID_NOT_FOUND] = "Пользователь не найден";
g_errorDescription[g_errors.TOKEN_EXPIRED] = "Токен устарел";
g_errorDescription[g_errors.CHANGE_TARIFF_FAILED] = "Смена тарифа не удалась";
g_errorDescription[g_errors.SERVICE_ACTIVATION_FAILED] = "Активация услуги не удалась";
g_errorDescription[g_errors.OFFER_ACTIVATION_FAILED] = "Активация предложения не удалась";
g_errorDescription[g_errors.GET_TARIFFS_FAILED] = "Получение тарифов не удалось";
g_errorDescription[g_errors.GET_SERVICES_FAILED] = "Получение услуг не удалось";
g_errorDescription[g_errors.REMOVE_SERVICE_FROM_PREPROCESSING_FAILED] = "Удаление сервиса из предобрабоки не удалось";
g_errorDescription[g_errors.LOGIC_IS_BLOCKING] = "Логика заблокирована другим запросом";
g_errorDescription[g_errors.TOO_MANY_REQUESTS] = "Слишком много запросов";
g_errorDescription[g_errors.PAYMENTS_OR_EXPENSES_MISSED] = "Какая-то проблема с платежами или тратами";
g_errorDescription[g_errors.INTERNAL_APPLICATION_ERROR] = "Внутренняя ошибка приложения";

function lifeGet(method, params) {
	if (!isset(params.accessKeyCode))
		params.accessKeyCode = '7';
	var url = createSignedUrl(method, params);
	var xml = AnyBalance.requestGet(url);
	var code = getParam(xml, null, null, /<responseCode>([\s\S]*?)<\/responseCode>/i, replaceTagsAndSpaces);
	if (!g_errorDescription[code]) {
		AnyBalance.trace('Неожиданный ответ сервера (' + method + '): ' + xml);
		throw new AnyBalance.Error('Неожиданный ответ сервера!');
	}
	if (code < 0)
		throw new AnyBalance.Error(method + ': ' + g_errorDescription[code]);
	return xml;
}

function parseTrafficMb(str) {
	var val = parseBalance(str);
	if (isset(val))
		val = Math.round(val / 1024 / 1024 * 100) / 100;
	return val;
}

function mainMobileApp(prefs, baseurl){
    if (!prefs.prefph || !/^\d{3}$/.test(prefs.prefph))
		throw new AnyBalance.Error('Введите префикс для вашего номера телефона (3 цифры)');
    if (!prefs.phone || !/^\d{7}$/.test(prefs.phone))
		throw new AnyBalance.Error('Введите номер вашего телефона (7 цифр)');
	
    var prefs = AnyBalance.getPreferences();
    var msisdn = '38' + prefs.prefph + prefs.phone;
    var lang = prefs.lang || 'ru';
    
	var xml = lifeGet('signIn', {msisdn: msisdn, superPassword: prefs.pass});
	
    var token = getParam(xml, null, null, /<token>([\s\S]*?)<\/token>/i, replaceTagsAndSpaces);
    if (!token)
		throw new AnyBalance.Error('He удалось авторизоваться в Life API!');

    var result = {success: true};

	xml = lifeGet('getSummaryData', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
	//Основной счет
	sumParam(xml, result, 'Mbalance', /<balance[^>]+code="Line_Main"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонусный счет
	getParam(xml, result, 'Bbalance', /<balance[^>]+code="Line_Bonus"[^>]*amount="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	//Долг
	sumParam(xml, result, 'Mbalance', /<balance[^>]+code="Line_Debt"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Срок действия
	getParam(xml, result, 'till', /<attribute[^>]+name="LINE_SUSPEND_DATE"[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/attribute>/i, replaceTagsAndSpaces, parseDateISO);
	//Тариф
	getParam(xml, result, '__tariff', /<tariff[^>]*>[\s\S]*?<name[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable('gprs', 'mms_uk', 'mms_life', 'sms_uk', 'sms_life', 'mins_family', 'mins_life', 'mins_fixed', 'mins_uk', 'mins_mob')) {
    	xml = lifeGet('getBalances', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
    	//Подарочный трафик
    	sumParam(xml, result, 'gprs', /<balance[^>]+code="FreeGprs[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
    	//Трафик бывший подарочный
    	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
    	//Трафик пакетный
    	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_All[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
    	//Трафик в Безумном дне
    	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet_Youth"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
    	//Трафик Интернет за копейку для Востока
    	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet_Kopiyka"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMbLeftIK, aggregate_sum);
    	//Трафик Интернет+Россия для Востока
    	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet_East"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMbLeftIE, aggregate_sum);
    	//Подарочные MMS в сети Life:)
    	sumParam(xml, result, 'mms_life', /<balance[^>]+code="FreeMms[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//MMS в сети Life:)
    	sumParam(xml, result, 'mms_life', /<balance[^>]+code="Bundle_Mms_Onnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//MMS по Украине
    	sumParam(xml, result, 'mms_uk', /<balance[^>]+code="Bundle_Mms_Ukraine[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Подарочные SMS в сети Life:)
    	sumParam(xml, result, 'sms_life', /<balance[^>]+code="FreeSms[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//SMS в сети Life:)
    	sumParam(xml, result, 'sms_life', /<balance[^>]+code="Bundle_Sms_Onnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//SMS по Украине
    	sumParam(xml, result, 'sms_uk', /<balance[^>]+code="Bundle_Sms_Ukraine[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты на родные номера в старом варианте Свободного Лайфа
    	sumParam(xml, result, 'mins_family', /<balance[^>]+code="Bundle_UsageN_FF_FREE[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты по сети Life:)
    	sumParam(xml, result, 'mins_life', /<balance[^>]+code="Bundle_Voice_Onnet"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты по сети Life:) западных тарифов
    	sumParam(xml, result, 'mins_life', /<balance[^>]+code="Bundle_Voice_Onnet_West"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalanceLeft, aggregate_sum);
    	//Минуты на номера фиксированной связи Украины
    	sumParam(xml, result, 'mins_fixed', /<balance[^>]+code="Bundle_Voice_Pstn[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты на номера других операторов и фиксированной связи Украины
    	sumParam(xml, result, 'mins_uk', /<balance[^>]+code="Bundle_Voice_Offnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Мин. услуги "life:) 5 копеек"
    	sumParam(xml, result, 'mins_uk', /<balance[^>]+code="Counter_Voice_Offnet_Lviv"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты на номера мобильных операторов Украины (Безумный день Bundle_Youth_Voice_Omo_Pstn)
    	sumParam(xml, result, 'mins_mob', /<balance[^>]+code="Bundle_Youth_Voice[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты на номера мобильных операторов Украины (Снова дешевле Bundle_Voice_Omo_ReCheaper)
    	sumParam(xml, result, 'mins_mob', /<balance[^>]+code="Bundle_Voice_Omo[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }
    if (AnyBalance.isAvailable('phone')) {
    	result.phone = '+' + msisdn;
    }

    AnyBalance.setResult(result);
}