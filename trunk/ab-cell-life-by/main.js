/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://issa2.life.com.by/';
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);
	
    var matches = prefs.login.match(/^(\d{2})(\d{7})$/);
    if(!matches)
        throw new AnyBalance.Error('Пожалуйста, введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей.');
        
    html = AnyBalance.requestPost(baseurl, {
        Code: matches[1],
        Phone: matches[2],
        password: prefs.password
    }, g_headers);
    
    if(!/\/Account.aspx\/Logoff/i.test(html)){
        var error = getParam(html, null, null, /<div class="validation-summary-errors errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};
	
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий основной баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_bonus', /Текущий бонусный баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);

    if (AnyBalance.isAvailable('traffic_left')) {
    	html = AnyBalance.requestGet(baseurl + 'User.aspx/Index');
    	var table = getParam(html, null, null, /Остаток пакетов:[\s\S]*<table[^>]+class="longinfo"[^>]*>([\s\S]*?)<\/table>/i);
    	if (table) {
    		sumParam(html, result, 'traffic_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr|НОЧНОЙ))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:[мmkкгg][бb]|байт|byte)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		sumParam(html, result, 'min_left_other', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr))*?другие сети(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:мин|min)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    		sumParam(html, result, 'min_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr|другие сети))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:мин|min)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    		sumParam(html, result, 'traffic_night_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr))*?НОЧНОЙ(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:[мmkкгg][бb]|байт|byte)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		sumParam(html, result, 'sms_left', /<td[^>]*>(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:СМС|sms)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    		sumParam(html, result, 'mms_left', /<td[^>]*>(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:ММС|mms)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	} else {
    		AnyBalance.trace('Информация по пакетам не найдена.');
    	}
    }
    AnyBalance.setResult(result);
}