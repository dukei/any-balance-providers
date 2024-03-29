﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Linux; Android 7.1.1; ONEPLUS A5000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Mobile Safari/537.36',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Referer': 'https://auth.lifecell.ua/',
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7'

};

  // Default options are marked with *

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.lifecell.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.phone, 'Введите номер телефона!');
	checkEmpty(prefs.pass, 'Введите пароль!');
	if(prefs.type == 'site') {
		try{
			mainSite(prefs, baseurl);
		}catch(e){
			AnyBalance.trace(e.message);
                        AnyBalance.trace('Не удалось получить данные с сайта. Пытаюсь получить из мобильного приложения');
                        mainMobileApp(prefs, baseurl);
		}
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

    matches = /(\d+)\s*мин/i.exec(str);
    if(matches){
    	time = +matches[1]*60;
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
function loginSite(prefs){
	checkEmpty(/^\d{7}$/i.test(prefs.phone), 'Введите ровно 7 цифр телефонного номера, без пробелов и разделителей!');
	var html = AnyBalance.requestGet('https://my.lifecell.ua/ru/sso-login/?next=/ru/osnovnaya-informaciya/osnobnaya-informaciya/', g_headers);
	var lang = prefs.lang || 'ru';
	var form = getElement(html, /<form[^>]+msisdn-form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
	}
	var recaptcha=getParam(form, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
        AnyBalance.trace('recaptcha='+recaptcha);
	var params = {
		username: '38'+prefs.prefph+prefs.phone,
        rememberMe: 'on',
	};

	if(recaptcha && getParam(form, /data-sitekey[^>]*?disabled\s*=\s*"([^"]*)/i, replaceHtmlEntities) !== 'True'){
	    params['g-recaptcha-response'] = solveRecaptcha("Пожалуйста, докажите, что Вы не робот", AnyBalance.getLastUrl(), recaptcha);
	}else{
		AnyBalance.trace('Капча не требуется, ура');
	}
	var action=getParam(form,/action="([^"]*)/,replaceHtmlEntities);
	html = AnyBalance.requestPost(action, params,g_headers
	/*	addHeaders({
		Accept: 'application/json, text/plain, ',
		'X-CSRFToken': params.csrfmiddlewaretoken,
		Referer: AnyBalance.getLastUrl()
		})*/
	);

	var form = getElement(html, /<form[^>]+password-form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
	}
	var params = {
		username: '',
        password: prefs.pass
	};
	var action=getParam(form,/action="([^"]*)/,replaceHtmlEntities);
	html = AnyBalance.requestPost(action, params,g_headers);
	
	if(/one-time-code/i.test(html)){
	    var form = getElement(html, /<form[^>]+otp-form/i);
	    if(!form){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
	    }
	    var code = AnyBalance.retrieveCode('Пожалуйста, введите код из 6 цифр из SMS, отправленного на ваш номер '+'38'+prefs.prefph+prefs.phone, null, {inputType: 'number', time: 180000});
	    var params = {
	    	username: '',
            password: code
	    };
	    var action=getParam(form,/action="([^"]*)/,replaceHtmlEntities);
	    html = AnyBalance.requestPost(action, params,g_headers);
	}else{
		AnyBalance.trace('SMS-код не требуется, ура');
	}
	
	return html;
}
function loginSiteOld(prefs,baseurl){
    var msisdn = '38' + prefs.prefph + prefs.phone;

    var html = AnyBalance.requestGet('https://auth.lifecell.ua/auth/realms/lifecell/protocol/openid-connect/logout?redirect_uri=https%3A%2F%2Fauth.lifecell.ua%2Fauth%2Frealms%2Flifecell%2Fprotocol%2Fopenid-connect%2Fauth%3Fredirect_uri%3Dlifecell.sso%3A%2Foauth2redirect%26client_id%3Dmy-lifecell-app-android%26response_type%3Dcode%26state%3DjqWFQcMIrPhdp99Ahx4lcQ%26scope%3Dopenid%2520offline_access%26code_challenge%3DsqhxgO3NL5QDeFAHfx8rri5x34TGzUv3Ovr6wYl6-8w%26code_challenge_method%3DS256%26ui_locales%3Den', g_headers); 
	var form = getElement(html, /<form[^>]+username-form/i);
    if(!form){
    	AnyBalance.trace(form);
    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
    AnyBalance.trace('Найдена форма авторизации');
    var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    var params = createFormParams(form);
    params.username = msisdn;

    html = AnyBalance.requestPost(action, params, g_headers,{followRedirect:false});
    form = getElement(html, /<form[^>]+password-form/i);
    if(!form){
    	if(/otp-form/i.test(html))
    		throw new AnyBalance.Error('Потребовался ввод смс. Авторизуйтесь хотя бы раз в приложении My LifeCell');
    	AnyBalance.trace(form);
    	throw new AnyBalance.Error('Не удалось найти форму ввода пароля. Сайт изменен?');
    }
    AnyBalance.trace('Логин отправлен');
    action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    params = createFormParams(form);
    params.password = prefs.pass;

    try{  
	html = AnyBalance.requestPost(action, params, g_headers);
    }catch(e){
	AnyBalance.trace('Пароль отправлен');
    };
    return AnyBalance.requestGet(baseurl, g_headers);;

}
function getJWT(base64){
    base64 = base64.split('.')[1];
    var base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}
function loginSiteByCookies(prefs,baseurl,session_code){
AnyBalance.trace(JSON.stringify(AnyBalance.getCookies()));
    html = AnyBalance.requestPost('https://auth.lifecell.ua/auth/realms/lifecell/protocol/openid-connect/token', {
		password: prefs.pass,
		username:'38'+prefs.prefph+prefs.phone,
		grant_type:'password',
		session_code:session_code,
    }, addHeaders({
    	Accept: 'application/json',
    	'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; ONEPLUS A3010 Build/PKQ1.181203.001)',
    	Authorization: 'Basic bXktbGlmZWNlbGwtYXBwLWFuZHJvaWQ6NGUxNjE4YTMtNjdhMS00OTA4LTk5OWUtNTAzMGExOWE2N2Jj'
    }));
    var json = getJson(html);
    if (!json.access_token) throw new AnyBalance.Error('Не удалось авторизоваться по кукам');;

    AnyBalance.setCookie('.my.lifecell.ua','kc_token',json.access_token,{path: '/',secure: true});
    AnyBalance.setCookie('.my.lifecell.ua','kc_refreshToken',json.refresh_token,{path: '/',secure: true});
    var json=getJWT(json.access_token);
    AnyBalance.setCookie('auth.lifecell.ua','AUTH_SESSION_ID',json.session_state+'.sso-prod1',{path: '/auth/realms/lifecell/',secure: true});
    AnyBalance.setCookie('auth.lifecell.ua','KEYCLOAK_REMEMBER_ME','username:38'+prefs.prefph+prefs.phone,{path: '/auth/realms/lifecell/',secure: true});
    AnyBalance.setCookie('auth.lifecell.ua','KEYCLOAK_SESSION','lifecell/'+json['sub']+'/'+json.session_state,{path: '/auth/realms/lifecell/',secure: true});
    AnyBalance.setCookie('auth.lifecell.ua','KEYCLOAK_SESSION_LEGACY','lifecell/'+json['sub']+'/'+json.session_state,{path: '/auth/realms/lifecell/',secure: true});
AnyBalance.trace(JSON.stringify(AnyBalance.getCookies()));
    //AnyBalance.setCookie('my.lifecell.ua','csrftoken',token,{path: '/',secure: true});
    return AnyBalance.requestGet(baseurl + 'ru/osnovnaya-informaciya/osnobnaya-informaciya/', g_headers);
}

function mainSite(prefs, baseurl) {
	AnyBalance.restoreCookies();
	var html = AnyBalance.requestGet(baseurl + 'ru/osnovnaya-informaciya/osnobnaya-informaciya/', g_headers);
	if(AnyBalance.getLastStatusCode() > 400 || !html)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');

	checkEmpty(/^\d{7}$/i.test(prefs.phone), 'Введите ровно 7 цифр телефонного номера, без пробелов и разделителей!');

	var lang = prefs.lang || 'ru';
	var formatted_phone = '+38 (' + prefs.prefph + ') ' + prefs.phone.replace(/(\d{3})(\d{2})(\d{2})/, '$1-$2-$3');
//	if (!/logout/.test(html)) var html=loginSiteOld(prefs,baseurl);
//	if (!/logout/.test(html)) var html=loginSiteByCookies(prefs,baseurl,getParam(html,/session_code=([^&]*)/));
        if (!/logout/.test(html)) var html=loginSite(prefs);
         if (!/logout/.test(html)){
               	clearAllCookies();
                AnyBalance.saveCookies();
               	AnyBalance.saveData();
               	AnyBalance.trace(html);
               	throw new AnyBalance.Error('Не удалось авторизоваться. Сайт изменен?');	
         }
        var result = {success: true};
        // Основной счет
	getParam(html, result, 'Mbalance', />Основной счет:(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        // Бонусный счет
        // Тариф
	  getParam(html, result, '__tariff', /general-detailed__main-info-title">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);


	var table = getElement(html, /<table[^>]+table--columns-2/i);
	var rows = getElements(table, /<tr/ig);
	for(var i=0; i<rows.length; i++){
		var row = rows[i];
		var name = getParam(row, /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var value = getParam(row, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		AnyBalance.trace('Найден параметр ' + name + ': ' + value);

		if(/Бонусный счет/i.test(name)){
			getParam(value, result, 'Bbalance', null, null, parseBalance);
		}else if(/минут/i.test(name) && /life/i.test(name)){  //Минуты по сети Life:)
    		sumParam(value, result, 'mins_life', null, null, parseSec, aggregate_sum);
		}else if(/25 - 3000/i.test(name)){     	//Минуты по сети Life:) тариф Life 25
    		sumParam(value, result, 'mins_life', null, null, parseSec, aggregate_sum);
		}else if(/минут/i.test(name) && /други/i.test(name)){  //Минуты на других операторов
    		sumParam(value, result, 'mins_uk', null, null, parseSec, aggregate_sum);
		}else if(/Интернет/i.test(name) && /3g/i.test(name)){  //3g
    		sumParam(value, result, 'hspa', null, null, parseTraffic, aggregate_sum);
		}else if(/Интернет/i.test(name)){  //3g
    		sumParam(value, result, 'gprs', null, null, parseTraffic, aggregate_sum);
		}else if(/BiP в роуминге/i.test(name)){  //3g
    		sumParam(value, result, 'hspa_roam', null, null, parseTraffic, aggregate_sum);
		}else if(/MMS/i.test(name) && /life/i.test(name)){  //mms по life
    		sumParam(value, result, 'mms_life', null, null, parseBalance, aggregate_sum);
		}else if(/sms/i.test(name) && /life/i.test(name)){  //sms по life
    		sumParam(value, result, 'sms_life', null, null, parseBalance, aggregate_sum);
		}else if(/mms/i.test(name)){  //mms по украине
    		sumParam(value, result, 'mms_uk', null, null, parseBalance, aggregate_sum);
		}else if(/sms/i.test(name)){  //sms по украине
    		sumParam(value, result, 'sms_uk', null, null, parseBalance, aggregate_sum);
		}else if(/абонентская плата/i.test(name)){
    		getParam(value, result, 'ap', null, null, parseBalance);
		}else if(/Срок действия номера/i.test(name)){
    		getParam(value, result, 'till', null, null, parseDate);
		}else{
			AnyBalance.trace('^-- Неизвестный параметр. Пропускаем');
		}
	}

	//Срок действия
	//getParam(html, result, 'till', />Срок действия номера(?:[\s\S]*?<td[^>]*>){1}\s*([\s\d.,\-]+)/i, replaceTagsAndSpaces, parseDate);
	// Телефон
	getParam(formatted_phone, result, 'phone');
	getParam(html,result,'till_tarif',/replace\(\'SERVICE_DATE\'\,\s\'(\d{2}\.\d{2}\.\d{4})\'\)/,null,parseDate);

	if(/Смарт семья|Смарт сім’я|Smart family/i.test(result.__tariff)){
		html = AnyBalance.requestGet(baseurl + 'ru/osnovnaya-informaciya/smart-semya/', addHeaders({Referer: baseurl}));

    	sumParam(html, result, 'mins_uk', /Остаток(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	sumParam(html, result, 'hspa', /Остаток(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	sumParam(html, result, 'sms_uk', /Остаток(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	}
	AnyBalance.saveCookies();
	AnyBalance.saveData();
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

var g_api_baseurl = 'https://api.lifecell.com.ua/mobile/';

function createSignedUrl(method, params) {
	var str = createParams(params);
	str = method + str + '&signature=';
	var hash = CryptoJS.HmacSHA1(str, "E6j_$4UnR_)0b");
	hash = hash.toString(CryptoJS.enc.Base64);
	str += encodeURIComponent(hash);
	return g_api_baseurl + str;
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
		throw new AnyBalance.Error(method + ': ' + g_errorDescription[code], null, /парол/i.test(g_errorDescription[code]));
	return xml;
}

function parseTrafficMb(str) {
	return parseTraffic(str + 'Bytes');
}

function getTokenByPassword(prefs,headers){
    html = AnyBalance.requestPost('https://auth.lifecell.ua/auth/realms/lifecell/protocol/openid-connect/token', {
		password: prefs.pass,
		username:'38'+prefs.prefph+prefs.phone,
		grant_type:	'password',
//		redirect_uri:	'https://anybalance.ru',
//		code_verifier:	'IkpkVQY0jdQvs7MwLaA__KMJZ_8uell7hQsYxB97DaoheroiGM_gDftuXxVrrV2KtWAlbuKj9RttE2z6mv42gQ'
    }, addHeaders({
    	Accept: 'application/json',
    	'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; ONEPLUS A3010 Build/PKQ1.181203.001)',
    	Authorization: 'Basic bXktbGlmZWNlbGwtYXBwLWFuZHJvaWQ6NGUxNjE4YTMtNjdhMS00OTA4LTk5OWUtNTAzMGExOWE2N2Jj'
    }));
    var json = getJson(html);
    if(!json.access_token){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить access_token. Сайт изменен?');
    }
	var xml = lifeGet('sso', {
		token: json.access_token,
		refreshToken: json.refresh_token
	});
	return xml;
}

function mainMobileApp(prefs, baseurl){
    var prefs = AnyBalance.getPreferences();
    if (!prefs.prefph || !/^\d{3}$/.test(prefs.prefph))
		throw new AnyBalance.Error('Введите префикс для вашего номера телефона (3 цифры)');
    if (!prefs.phone || !/^\d{7}$/.test(prefs.phone))
		throw new AnyBalance.Error('Введите номер вашего телефона (7 цифр)');
	
    var msisdn = '38' + prefs.prefph + prefs.phone;
    var lang = prefs.lang || 'ru';
    
    var token, xml,subId;
    	token=AnyBalance.getData('token'+prefs.phone);
        subId=AnyBalance.getData('subId'+prefs.phone);
        if (token) {
            AnyBalance.trace('Найден старый токен. Проверяем.');
            try{
            	xml = lifeGet('getSummaryData', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
            	AnyBalance.trace('Старый токен в порядке. Будем использовать его.');
            }
            catch(e){
            	AnyBalance.trace('Стрый токен не подходит.'+(subId?'Пробуем обновить':''));
            	if (subId) {
            		try{
            			xml = lifeGet('getToken', {msisdn: msisdn, subId: subId, clientVersion: '4.5.8'});
            			token = getParam(xml, null, null, /<token>([\s\S]*?)<\/token>/i, replaceTagsAndSpaces);
                                if (token) AnyBalance.trace('Получен новый токен');
            		}
            		catch(e){
            			AnyBalance.trace('Не удалось обновить токен. Удаляем старый токен');
            			token='';
                                subId='';
            		}
            	}else{
            			AnyBalance.trace('Удаляем старый токен');
            			token='';
            			subId='';
            	}
            }

        }
        if(!token){
    	   try{
    	   	AnyBalance.trace('Пробуем получить токен на api.life.com.ua');
    		g_api_baseurl = 'https://api.life.com.ua/mobile/';
		xml = lifeGet('signIn', {msisdn: msisdn, superPassword: prefs.pass});
                g_api_baseurl = 'https://api.lifecell.com.ua/mobile/';
		token = getParam(xml, null, null, /<token>([\s\S]*?)<\/token>/i, replaceTagsAndSpaces);
		subId= getParam(xml, null, null, /<subId>([\s\S]*?)<\/subId>/i, replaceTagsAndSpaces);
	   }catch(e){
                AnyBalance.trace('Не удалось получить токен.');
		if(AnyBalance.getLastStatusCode() == 403){
			AnyBalance.trace('Пробуем получить токен на api.lifecell.com.ua');
			xml = getTokenByPassword(prefs);
			token = getParam(xml, null, null, /<token>([\s\S]*?)<\/token>/i, replaceTagsAndSpaces);
			subId= getParam(xml, null, null, /<subId>([\s\S]*?)<\/subId>/i, replaceTagsAndSpaces);
		}else{
			throw e;
		}
	   }
	}
	AnyBalance.setData('token'+prefs.phone,token);
	if (subId) AnyBalance.setData('subId'+prefs.phone,subId);
        AnyBalance.saveData();
	if (!token) throw new AnyBalance.Error('Не удалось получить токен авторизации. Изменения в API?');

        var result = {success: true};
	if (!/getSummaryData/.test(xml)) xml = lifeGet('getSummaryData', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
	//Основной счет
	sumParam(xml, result, 'Mbalance', /<balance[^>]+code="Line_Main"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонусный счет
	getParam(xml, result, 'Bbalance', /<balance[^>]+code="Line_Bonus"[^>]*amount="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	//Долг
	sumParam(xml, result, 'Mbalance', /<balance[^>]+code="Line_Debt"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Срок действия
	getParam(xml, result, 'till', /<attribute[^>]+name="LINE_SUSPEND_DATE"[^>]*>\s*([^<]*)</i, replaceTagsAndSpaces, parseDateISO);
	if (!result.till)
		d=getParam(xml, result, 'till', /<attribute[^>]+name="NEXT_FEE_CHARGING_DATE"[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseDateISO);

	//Тариф
	getParam(xml, result, '__tariff', /<tariff[^>]*>[\s\S]*?<name[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/i, replaceTagsAndSpaces);

    if (AnyBalance.isAvailable('gprs', 'mms_uk', 'mms_life', 'sms_uk', 'sms_life', 'mins_family', 'mins_life', 'mins_fixed', 'mins_uk', 'mins_mob', 'till_tarif')) {
    	xml = lifeGet('getBalancesNew', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
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
    	//Трафик 3G
    	sumParam(xml, result, 'hspa', /<balance[^>]+code="Bundle_Internet_3G[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
    	//Трафик в роуминге
    	sumParam(xml, result, 'hspa_roam', /<balance[^>]+code="[^"]*Internet_Roam[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
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
    	sumParam(xml, result, 'mins_life', /<balance[^>]+code="Bundle_Voice_Onnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты по сети Life:) западных тарифов
		if (result.__tariff != 'Вільний life:) 2016' && result.__tariff != 'Свободный life:) 2016' && result.__tariff != 'Free life:) 2016') {
    		sumParam(xml, result, 'mins_life', /<balance[^>]+code="Bundle_Voice_Onnet_West"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalanceLeft, aggregate_sum);
		}
    	//Минуты на номера фиксированной связи Украины
    	sumParam(xml, result, 'mins_fixed', /<balance[^>]+code="Bundle_Voice_Pstn[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты на номера других операторов и фиксированной связи Украины
    	sumParam(xml, result, 'mins_uk', /<balance[^>]+code="Bundle_Voice_Offnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	sumParam(xml, result, 'mins_uk', /<balance[^>]+code="Bundle_Voice_Ukraine[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Мин. услуги "life:) 5 копеек"
    	sumParam(xml, result, 'mins_uk', /<balance[^>]+code="Counter_Voice_Offnet_Lviv"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты на номера мобильных операторов Украины (Безумный день Bundle_Youth_Voice_Omo_Pstn)
    	sumParam(xml, result, 'mins_mob', /<balance[^>]+code="Bundle_Youth_Voice[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	//Минуты на номера мобильных операторов Украины (Снова дешевле Bundle_Voice_Omo_ReCheaper)
    	sumParam(xml, result, 'mins_mob', /<balance[^>]+code="Bundle_Voice_Omo[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(xml, result, 'ap', /<balance[^>]+code="Indicator_Life_Unlim_DF_Charged[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(xml, result, 'till_tarif', /renew_date>([^<]*)<\/renew_date>/i, [/(\d{4})-(\d{2})-(\d{2})/,'$3.$2.$1'],parseDate);
    }
    if (AnyBalance.isAvailable('phone')) {
    	result.phone = '+' + msisdn;
    }

    AnyBalance.setResult(result);
}
