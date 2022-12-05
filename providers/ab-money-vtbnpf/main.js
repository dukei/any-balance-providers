/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
};

var baseurl = 'https://lk.vtbnpf.ru';

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{11}$/.test(prefs.login), 'Введите номер пенсионного страхового свидетельства - 11 цифр без пробелов и разделителей!');
	}
	    
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var login = prefs.login.replace(/[^\d]+/g, '');
	var formattedLogin = login.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/i, '$1-$2-$3-$4');
	    
	var html = AnyBalance.requestGet(baseurl + '/index.php?from=main', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	    
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + '/code.php');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	    
	html = AnyBalance.requestPost(baseurl + '/ipension/fiz/login.php', {
		ag: '',
		kod: formattedLogin,
		pass: prefs.password,
		code: captchaa,
		ajax: 'y'
    }, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Referer': baseurl + '/ipension/fiz/login.php',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	    
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
		
	if(json.result !== 1){
		var error = json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол|не найден/i.test(error));
		
		AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var redirectUrl = json.redirect;
	
	html = AnyBalance.requestGet(joinUrl(baseurl, redirectUrl), addHeaders({Referer: baseurl + '/'}));

    var result = {success: true};
	
	getParam(html, result, 'balance', /Накоплений по(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /Номер счета(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Номер счета(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contract_num', /Номер договора(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contract_date', /Дата договора(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'snils', /name="snils" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'email', /name="email" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /name="tel" value="([^"]*)/i, [replaceTagsAndSpaces, /.*(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
	var person = {};
	sumParam(html, person, '__n', /name="fam" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	sumParam(html, person, '__n', /name="nam" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	sumParam(html, person, '__n', /name="otch" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	getParam(person.__n, result, 'fio');
	
    AnyBalance.setResult(result);
}