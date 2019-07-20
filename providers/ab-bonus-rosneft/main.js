/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://komandacard.ru/';

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

	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона в формате 9261234567 без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'location/getcity', g_headers);
	var json = getJson(html);

	AnyBalance.setCookie('komandacard.ru', 'regionId', json.regionId);

	var html = AnyBalance.requestGet(baseurl + 'account/login', g_headers);
	var rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);

	var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl + 'login', "6LejgioUAAAAAK6ZVEm_o8YhLHpnBil1J-hrPQnB");

	html = AnyBalance.requestPost(baseurl + 'account/login', JSON.stringify({
		Data: [
			{
				name: 'Phone',
				value: '+7 ' + prefs.login,
			},
			{
				name: 'Password',
				value: prefs.password,
			},
			{
				name: 'g-recaptcha-response',
				value: captcha,
			},
			{
				name: 'Captcha',
				value: captcha,
			},
		],
		GoForward: true
	}), addHeaders({
		RequestVerificationToken: rvt,
		'Content-Type': 'application/json'
	}));

	if(/SelectedChannelId/.test(html)){
		AnyBalance.trace('Просим подтвердить Вашу личность одним из доступных способов');

		var label = getElement(html, /<label[^>]+for="0"/i, replaceTagsAndSpaces);
		if(!label){
			throwError(html, 'Не удаётся найти вариант подтверждения входа. Сайт изменен?');
		}

		rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
	   	
		html = AnyBalance.requestPost(baseurl + 'account/login', JSON.stringify({
            "GoForward": true,
            "Data": [
                {
                    "name": "SelectedChannelId",
                    "value": "0"
                },
                {
                    "name": "__RequestVerificationToken",
                    "value": rvt
                }
            ]
		}), addHeaders({
			RequestVerificationToken: rvt,
			'Content-Type': 'application/json'
		}));

		if(!/<input[^>]+name="Otp"/i.test(html)){
			throwError(html, 'Не удалось запросить подтверждение входа. Сайт изменен?');
		}

		var code = AnyBalance.retrieveCode('Пожалуйста, введите код, высланный на ' + label, null, {inputType: 'number', time: 180000});

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
			RequestVerificationToken: rvt,
			'Content-Type': 'application/json'
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

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'account', addHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'}));

	getParam(html, result, 'balance', /Баллов всего:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Баллов доступно:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_bonus', 'last_place', 'last_status')){
		var dt = new Date();
		html = AnyBalance.requestGet(baseurl + 'report/01.01.1900/' + n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear(),
			addHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'}));

		var row = getElement(html, /<div[^>]+block-statement__content/i);
		row = row && getElement(row, /<div[^>]+block-table__body/i);
		row = row && getElement(row, /<div[^>]+"block-table__row/i);
		getParam(row, result, 'last_date', /(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
		getParam(row, result, 'last_place', /(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(row, result, 'last_sum', /(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(row, result, 'last_status', /(?:[\s\S]*?<div[^>]*>){7}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(row, result, 'last_bonus', /(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}   
	
	AnyBalance.setResult(result);
}

function n2(str){
	str = '' + str;
	if(str.length < 2)
		str = '0' + str;
	return str;
}