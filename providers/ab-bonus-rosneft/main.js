/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://komandacard.ru/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': baseurl.replace(/\/+$/, ''),
	'Referer': baseurl,
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest'
};

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
	
	var html = AnyBalance.requestGet(baseurl + 'account', g_headers);
	
	if(/data-show-login-form=""|Выход/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
    }

    var result = {success: true};
	
	if(AnyBalance.isAvailable('balance', 'available', 'accumulated_liters', 'to_next_level_liters', 'to_next_level_days', 'curr_level', 'next_level', 'card', 'card2', 'card3', '__tariff')){
	    html = AnyBalance.requestGet(baseurl + 'account', g_headers);

	    getParam(html, result, 'balance', /Баллов всего:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'available', /Баллов доступно:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		
		getParam(html, result, 'accumulated_liters', /<div[^>]+class="progress-label">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'to_next_level_liters', /осталось набрать:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'to_next_level_days', /Осталось до смены уровня:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		
		var status_val = {silver: 'Серебро', gold: 'Золото', platinum: 'Платина', diamond: 'Бриллиант', undefined: ''};
		var bonus_size = {silver: 0.5, gold: 1, platinum: 1.25, diamond: 1.5, undefined: ''};
		var curr_status_img = getParam(html, null, null, /<div[^>]+cabinet-status__img[^>][\s\S]*?status\/\w*card-([\s\S]*?)\.[\s\S]*?\/>/i, replaceTagsAndSpaces);
		var curLevel = getParam(status_val[curr_status_img]||curr_status_img, result, 'curr_level');
		var curBonusSize = bonus_size[curr_status_img]||curr_status_img;
		
		result.__tariff = curLevel + (curBonusSize ? ' | ' + curBonusSize + ' Б/л' : '');
		
		var status_block = getElement(html, /<div[^>]+class="block-cabinet__widget block-widget cabinet-status__progress"[^>]*>/i);
	    var status_images = getElements(status_block, [/<div[^>]+style="width: auto"[^>]*>/ig, /"status-img"/i]);
		
	    if(status_images) {
	        for(var i = 0; i<status_images.length; i++){
				var img = status_images[i];
				var status_img = getParam(img, null, null, /<img[^>]+status-img[^>][\s\S]*?-\w*-([\s\S]*?)\.[\s\S]*?\/>/i, replaceTagsAndSpaces);
				
				if(/progress-achieve/i.test(img)) // Следующий уровень
					getParam(status_val[status_img]||status_img, result, 'next_level');
	        }
	    } else {
 	    	AnyBalance.trace('Не удалось получить данные по уровням');
 	    }
	
	    var block = getElement(html, /<div[^>]+class="block-cabinet__team block-stat"[^>]*>/i);
	    var info = getElements(block, /<div[^>]+class="block-team__number"[^>]*>/ig);
	    AnyBalance.trace('Найдено карт: ' + info.length);
	    if(info) {
	    	// Данные по картам
	        for(var i = 0; i<info.length; i++){
	        	var mcard = (i >= 1 ? 'card' + (i + 1) : 'card');
	        	getParam(info[i], result, mcard, /<div[^>]+class="block-team__number"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /(\d{4})(\d{2})(.*)(\d{4})$/i, '$1 $2** **** $4']);
	        }
			
			if(!result.__tariff)
	    	    getParam(info[0], result, '__tariff', /<div[^>]+class="block-team__number"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /(\d{4})(\d{2})(.*)(\d{4})$/i, '$1 $2** **** $4']);
	    } else {
 	    	AnyBalance.trace('Не удалось получить данные по картам');
 	    }
	}
	
	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_bonus', 'last_place', 'last_status')){
        if (!/no-report/i.test(html)) {
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
		} else {
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
		html = AnyBalance.requestGet(baseurl + 'account/settings', g_headers);

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
	
	var html = AnyBalance.requestGet(baseurl + 'login?ReturnUrl=%2Faccount', addHeaders({'Referer': baseurl + 'login?ReturnUrl=%2Faccount'}));
	
	var csrf = getParam(html, /name='csrf-token-value' content='([^']*)/i, replaceHtmlEntities);
	
	if(!csrf){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}

//	var html = AnyBalance.requestGet(baseurl + 'location/getcity', g_headers);
//	var json = getJson(html);

//	AnyBalance.setCookie('komandacard.ru', 'regionId', json.regionId);

	var dt = new Date();
	var html = AnyBalance.requestGet(baseurl + 'account/login?_=' + dt.getTime(), addHeaders({'Referer': baseurl + 'login?ReturnUrl=%2Faccount'}));
	var rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
	
	if(!rvt){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен верификации. Сайт изменен?');
	}

	var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl + 'login', '6LejgioUAAAAAK6ZVEm_o8YhLHpnBil1J-hrPQnB', {USERAGENT: g_headers['User-Agent']});

	html = AnyBalance.requestPost(baseurl + 'account/login', JSON.stringify({
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
		'RequestVerificationToken': rvt,
		'Referer': baseurl + 'login?ReturnUrl=%2Faccount',
		'X-CsrfToken': csrf
	}));

	if(/SelectedChannelId/.test(html)){
		AnyBalance.trace('Сайт затребовал подтверждение входа');

		var label = getElement(html, /<label[^>]+for="[^"]+"/i);
		if(!label){
			throwError(html, 'Не удалось найти способ подтверждения входа. Сайт изменен?');
		}

		var channelId = getParam(label, /<label[^>]+for="([^"]+)"/i, replaceHtmlEntities);
		label = replaceAll(label, replaceTagsAndSpaces);

		rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
	   	
		html = AnyBalance.requestPost(baseurl + 'account/login', JSON.stringify({
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
		    'RequestVerificationToken': rvt,
		    'Referer': baseurl + 'login?ReturnUrl=%2Faccount',
		    'X-CsrfToken': csrf
		}));

		if(!/<input[^>]+name="Otp"/i.test(html)){
			throwError(html, 'Не удалось запросить подтверждение входа. Сайт изменен?');
		}

		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на ' + label, null, {inputType: 'number', time: 180000});

		rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
		html = AnyBalance.requestPost(baseurl + 'account/login', JSON.stringify({
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
		    'RequestVerificationToken': rvt,
		    'Referer': baseurl + 'login?ReturnUrl=%2Faccount',
		    'X-CsrfToken': csrf
		}));
	
		if(/<input[^>]+name="Otp"/i.test(html)){
			throwError(html, 'Не удалось запросить подтверждение входа. Сайт изменен?');
		}
	}

	json = {error: 'Не удалось войти в личный кабинет. Неверный логин и пароль или сайт изменен'};
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

	g_savedData.setCookies();
	g_savedData.save();
	return json;
}

function n2(str){
	str = '' + str;
	if(str.length < 2)
		str = '0' + str;
	return str;
}