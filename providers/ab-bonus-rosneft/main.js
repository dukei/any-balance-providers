/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://komandacard.ru/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function throwError(html, defError){
	var error = getElement(html, /<div[^>]+text-danger/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);
	AnyBalance.trace(html);
	throw new AnyBalance.Error(defError);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('komandacard', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(g_baseurl + 'account', g_headers);
	
	if(/data-show-login-form=""|Выход/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	html = loginSite(prefs);
    }

    var result = {success: true};
	
	getParam(html, result, 'balance', /Баллов всего:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Баллов доступно:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'burn_sum', /Баллы сгорают[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'burn_date', /Баллы сгорают[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, parseDate);
	
	getParam(html, result, 'accumulated_liters', /cabinet-status__progress[\s\S]*?<div[^>]+class="progress-label">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'to_next_level_liters', /осталось набрать:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'to_next_level_days', /Осталось до смены уровня:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accumulated_purchases', /cabinet-goods-status__progress[\s\S]*?<div[^>]+class="progress-label">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	var status_val = {silver: 'Серебро', gold: 'Золото', platinum: 'Платина', diamond: 'Бриллиант', undefined: ''};
	var bonus_size = {silver: 0.5, gold: 1, platinum: 1.25, diamond: 1.5, undefined: ''};
	var curr_status_img = getParam(html, null, null, /<div[^>]+cabinet-status__img[^>][\s\S]*?status\/\w*card-([\s\S]*?)\.[\s\S]*?\/>/i, replaceTagsAndSpaces);
	var curLevel = getParam(status_val[curr_status_img]||curr_status_img, result, 'curr_level');
	var curBonusSize = bonus_size[curr_status_img]||curr_status_img;
	
	result.__tariff = curLevel + (curBonusSize ? ' | ' + curBonusSize + ' Б/л' : '');
	
	var status_block = getElement(html, /<div[^>]+class="block-cabinet__widget block-widget cabinet-status__progress"[^>]*>/i);
	var status_images = getElements(status_block, [/<div[^>]+style="width: auto"[^>]*>/ig, /"status-img"/i]);
	
	if(status_images){
	    for(var i = 0; i<status_images.length; i++){
		    var img = status_images[i];
			var status_img = getParam(img, null, null, /<img[^>]+status-img[^>][\s\S]*?-\w*-([\s\S]*?)\.[\s\S]*?\/>/i, replaceTagsAndSpaces);
			
			if(/progress-achieve/i.test(img)) // Следующий уровень
				getParam(status_val[status_img]||status_img, result, 'next_level');
	    }
	}else{
 	    AnyBalance.trace('Не удалось получить данные по уровням');
 	}
	
	var block = getElement(html, /<div[^>]+class="block-cabinet__team block-stat"[^>]*>/i);
	var info = getElements(block, /<div[^>]+class="block-team__number"[^>]*>/ig);
	AnyBalance.trace('Найдено карт: ' + info.length);
	if(info){
	    // Данные по картам
	    for(var i = 0; i<info.length; i++){
	        var mcard = (i >= 1 ? 'card' + (i + 1) : 'card');
	        getParam(info[i], result, mcard, /<div[^>]+class="block-team__number"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /(\d{4})(\d{2})(.*)(\d{4})$/i, '$1 $2** **** $4']);
	    }
		
		if(!result.__tariff)
	    	getParam(info[0], result, '__tariff', /<div[^>]+class="block-team__number"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /(\d{4})(\d{2})(.*)(\d{4})$/i, '$1 $2** **** $4']);
	}else{
 	    AnyBalance.trace('Не удалось получить данные по картам');
 	}
	
	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_bonus', 'last_place', 'last_status')){
        if(!/no-report/i.test(html)){
		    var row = getElement(html, /<div[^>]+block-statement__content/i);
		    row = row && getElement(row, /<div[^>]+block-table__body/i);
		    rows = row && getElements(row, /<div[^>]+block-table__row/ig);
            last = rows[0];
		    getParam(last, result, 'last_date', /(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
			getParam(last, result, 'last_card', /(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		    getParam(last, result, 'last_place', /(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		    getParam(last, result, 'last_sum', /(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
			getParam(last, result, 'last_bonus', /(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		    getParam(last, result, 'last_status', /(?:[\s\S]*?<div[^>]*>){7}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		}else{
			var error = getParam(html, /<div class="no-report">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			AnyBalance.trace(error);
		}
	}
	
	if(AnyBalance.isAvailable('stat_azs', 'stat_partner')){
		var row = getElement(html, /<div[^>]+block-stat__legend/i);
		row = row && getElement(row, /<div[^>]+block-stat__content/i);
		getParam(row, result, 'stat_azs', /(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(row, result, 'stat_partner', /(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(AnyBalance.isAvailable('fio', 'phone', 'vehicle', 'tire_size', 'fuel_type')){
		html = AnyBalance.requestGet(g_baseurl + 'account/settings', addHeaders({
			'Content-Type': 'application/json',
			'Referer': g_baseurl + 'account',
			'X-Requested-With': 'XMLHttpRequest'
		}));

		var fio = getParam(html, /"Name" value="([\s\S]*?)"/i, replaceTagsAndSpaces);
		var lastName = getParam(html, /"LastName" value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	    if (lastName)
	    	fio += ' ' + lastName;
	    getParam(fio, result, 'fio');
		getParam(html, result, 'phone', /"Phone" value="([\s\S]*?)"/i, replaceNumber);
		getParam(html, result, 'vehicle', /"VehicleVendor">[\s\S]*?<option selected="selected">([\s\S]*?)<\/option>/i, replaceTagsAndSpaces);
		getParam(html, result, 'tire_size', /"VehicleWheelsSize">[\s\S]*?<option selected="selected">([\s\S]*?)<\/option>/i, replaceTagsAndSpaces);
		getParam(html, result, 'fuel_type', /"VehicleFuel"[\s\S]*?<option selected="selected">([\s\S]*?)<\/option>/i, replaceTagsAndSpaces);
	}
	
	AnyBalance.setResult(result);
}

function loginSite(prefs){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона в формате 10 цифр без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
	var html = AnyBalance.requestGet(g_baseurl + 'login', g_headers);
	
	var csrf = getParam(html, /name='csrf-token-value' content='([^']*)/i, replaceHtmlEntities);
	
	if(!csrf){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}

//	var html = AnyBalance.requestGet(g_baseurl + 'location/getcity', g_headers);
//	var json = getJson(html);

//	AnyBalance.setCookie('komandacard.ru', 'regionId', json.regionId);

	var dt = new Date();
	var html = AnyBalance.requestGet(g_baseurl + 'account/login?_=' + dt.getTime(), addHeaders({
		'Content-Type': 'application/json',
		'Referer': g_baseurl + 'account',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
	
	if(!rvt){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен верификации. Сайт изменен?');
	}

	var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', g_baseurl + 'login', '6LejgioUAAAAAK6ZVEm_o8YhLHpnBil1J-hrPQnB', {USERAGENT: g_headers['User-Agent']});

	html = AnyBalance.requestPost(g_baseurl + 'account/login', JSON.stringify({
        "GoForward": true,
        "Data": [
            {
                "name": "Phone",
                "value": "+7 " + prefs.login
            },
            {
                "name": "Password",
                "value": prefs.password
            },
            {
                "name": "g-recaptcha-response",
                "value": captcha
            },
            {
                "name": "__RequestVerificationToken",
                "value": rvt
            },
            {
                "name": "Captcha",
                "value": captcha
            }
        ]
    }), addHeaders({
		'Content-Type': 'application/json',
		'Requestverificationtoken': rvt,
		'Origin': g_baseurl.replace(/\/+$/, ''),
		'Referer': g_baseurl + 'login',
		'X-Csrftoken': csrf,
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	if(/<div[^>]+class="(?:text-danger\s)?validation-summary-errors"[^>]*>/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="(?:text-danger\s)?validation-summary-errors"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error){
			if(/&#x440;&#x43E;&#x431;&#x43E;&#x442;|робот/i.test(error)){ // Не прошли проверку на роботов
			    throw new AnyBalance.Error('Не удалось подтвердить, что вы не робот', null, false);
			}else if(/&#x43D;&#x43E;&#x43C;&#x435;&#x440;|&#x442;&#x435;&#x43B;&#x435;&#x444;&#x43E;&#x43D;|&#x43F;&#x430;&#x440;&#x43E;&#x43B;|номер|телефон|парол/i.test(error)){ // Неверный номер телефона или пароль
			    throw new AnyBalance.Error('Неверный номер телефона или пароль', null, true);
			}
			
            throw new AnyBalance.Error('Неверные параметры входа', null, true);
		}

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

	if(/SelectedChannelId/.test(html)){
		AnyBalance.trace('Сайт затребовал подтверждение входа');

		var label = getElement(html, /<label[^>]+for="[^"]+"/i);
		if(!label){
			throwError(html, 'Не удалось найти способ подтверждения входа. Сайт изменен?');
		}

		var channelId = getParam(label, /<label[^>]+for="([^"]+)"/i, replaceHtmlEntities);
		label = replaceAll(label, replaceTagsAndSpaces);

		rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
	   	
		html = AnyBalance.requestPost(g_baseurl + 'account/login', JSON.stringify({
            "GoForward": true,
            "Data": [
                {
                    "name": "SelectedChannelId",
                    "value": channelId
                },
                {
                    "name": "__RequestVerificationToken",
                    "value": rvt
                },
                {
                    "name": "csrftoken",
                    "value": csrf
                }
            ]
        }), addHeaders({
			'Content-Type': 'application/json',
		    'Requestverificationtoken': rvt,
			'Origin': g_baseurl.replace(/\/+$/, ''),
		    'Referer': g_baseurl + 'login',
		    'X-Csrftoken': csrf,
			'X-Requested-With': 'XMLHttpRequest'
		}));

		if(!/<input[^>]+name="Otp"/i.test(html)){
			throwError(html, 'Не удалось запросить подтверждение входа. Сайт изменен?');
		}

		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на ' + label, null, {inputType: 'number', time: 180000});

		rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
		html = AnyBalance.requestPost(g_baseurl + 'account/login', JSON.stringify({
            "GoForward": true,
            "Data": [
                {
                    "name": "Otp",
                    "value": code
                },
                {
                    "name": "__RequestVerificationToken",
                    "value": rvt
                },
                {
                    "name": "csrftoken",
                    "value": csrf
                }
            ]
        }), addHeaders({
			'Content-Type': 'application/json',
		    'Requestverificationtoken': rvt,
			'Origin': g_baseurl.replace(/\/+$/, ''),
		    'Referer': g_baseurl + 'login',
		    'X-Csrftoken': csrf,
			'X-Requested-With': 'XMLHttpRequest'
		}));
	
		if(/<input[^>]+name="Otp"/i.test(html)){
			throwError(html, 'Не удалось запросить подтверждение входа. Сайт изменен?');
		}
	}
	
	if(/<div[^>]+class="(?:text-danger\s)?validation-summary-errors"[^>]*>/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="(?:text-danger\s)?validation-summary-errors"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error){
			if(/&#x43A;&#x43E;&#x434;|код/i.test(error)) // Неверный код подтверждения
			    throw new AnyBalance.Error('Неверный код подтверждения', null, false);
			
            throw new AnyBalance.Error('Неверные параметры входа', null, true);
		}

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

	var json = {error: 'Не удалось войти в личный кабинет. Сайт изменен?'};
	try{
		json = getJson(html);
	}catch(e){
		AnyBalance.trace(html);
		AnyBalance.trace(e.message);
	}
	
	if(!json.isFinished){
		var error = json.error;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(g_baseurl + 'account', addHeaders({'Referer': g_baseurl + 'login'}));

	g_savedData.setCookies();
	g_savedData.save();
	return html;
}

function n2(str){
	str = '' + str;
	if(str.length < 2)
		str = '0' + str;
	return str;
}