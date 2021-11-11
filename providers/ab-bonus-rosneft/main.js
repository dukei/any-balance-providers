/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://komandacard.ru/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

var g_headers = {
	'Accept': '*/*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'X-Requested-With': 'XMLHttpRequest',
	'Origin': baseurl.replace(/\/+$/, ''),
	'Referer': baseurl,
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
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
	
	var html = AnyBalance.requestGet(baseurl + 'account', addHeaders({
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
	}));
	
	if(!/unauthorized/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
    }

    var result = {success: true};
	
	if(AnyBalance.isAvailable('balance', 'available', 'card', 'card2', 'card3', '__tariff')){
	    html = AnyBalance.requestGet(baseurl + 'account', addHeaders({
	    	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
	    }));

	    getParam(html, result, 'balance', /Баллов всего:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'available', /Баллов доступно:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	    var block = getElement(html, /<div[^>]+class="block-cabinet__team block-stat"[^>]*>/i);
	    var info = getElements(block, /<div[^>]+class="block-team__number"[^>]*>/ig);
	    AnyBalance.trace('Найдено карт: ' + info.length);
	    if(info) {
	    	// Данные по картам
	        for(var i = 0; i<info.length; i++){
	        	var mcard = (i >= 1 ? 'card' + (i + 1) : 'card');
	        	getParam(info[i], result, mcard, /<div[^>]+class="block-team__number"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	        }
	    	getParam(info[0], result, '__tariff', /<div[^>]+class="block-team__number"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	    } else {
 	    	AnyBalance.trace('Не удалось получить данные по картам');
 	    }
	}
	
	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_bonus', 'last_place', 'last_status')){
        if (!/no-report/i.test(html)) {
		    var row = getElement(html, /<div[^>]+block-statement__content/i);
		    row = row && getElement(row, /<div[^>]+block-table__body/i);
		    row = row && getElement(row, /<div[^>]+block-table__row/i);
		    getParam(row, result, 'last_date', /(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
		    getParam(row, result, 'last_place', /(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		    getParam(row, result, 'last_sum', /(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		    getParam(row, result, 'last_status', /(?:[\s\S]*?<div[^>]*>){7}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		    getParam(row, result, 'last_bonus', /(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		} else {
			var error = getParam(html, /<div class="no-report">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			AnyBalance.trace(error);
		}
	}
	
	if(AnyBalance.isAvailable('fio', 'phone', 'vehicle', 'tire_size', 'fuel_type')){
		html = AnyBalance.requestGet(baseurl + 'account/settings', addHeaders({
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
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
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона в формате 9261234567 без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');

//	var html = AnyBalance.requestGet(baseurl + 'location/getcity', g_headers);
//	var json = getJson(html);

//	AnyBalance.setCookie('komandacard.ru', 'regionId', json.regionId);

	var html = AnyBalance.requestGet(baseurl + 'account/login', g_headers);
	var rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);

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
                "name": "Captcha",
                "value": captcha
            }
        ]
	}), addHeaders({
		'RequestVerificationToken': rvt,
		'Content-Type': 'application/json',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	if(/SelectedChannelId/.test(html)){
		AnyBalance.trace('Просим подтвердить Вашу личность одним из доступных способов');

		var label = getElement(html, /<label[^>]+for="[^"]+"/i);
		if(!label){
			throwError(html, 'Не удаётся найти вариант подтверждения входа. Сайт изменен?');
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
                }
            ]
		}), addHeaders({
			'RequestVerificationToken': rvt,
			'Content-Type': 'application/json',
			'X-Requested-With': 'XMLHttpRequest'
		}));

		if(!/<input[^>]+name="Otp"/i.test(html)){
			throwError(html, 'Не удалось запросить подтверждение входа. Сайт изменен?');
		}

		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + label, null, {inputType: 'number', time: 180000});

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
                }
            ]
		}), addHeaders({
			'RequestVerificationToken': rvt,
			'Content-Type': 'application/json',
			'X-Requested-With': 'XMLHttpRequest'
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
			throw new AnyBalance.Error(error);//, null, /парол/i.test(error));
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