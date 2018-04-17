﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main(){
	AnyBalance.setDefaultCharset('utf-8');
	
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://lisa.motivtelecom.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        logintype:prefs.logintype || 1,
        abnum:prefs.login,
        pass:prefs.password,
        x:57,
        y:18
    }, g_headers);

    if(!/\/logout/i.test(html)){
    	if(AnyBalance.getLastStatusCode() >= 400){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('ЛИСА временно недоступна. Пожалуйста, попробуйте ещё раз позже.');
    	}

        var error = getParam(html, null, null, /<div[^>]*class="errmsg"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
          throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    getParam(html, result, 'balance',      /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                              AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, result, 'userName',     /Пользователь:(?:[^>]*>){2}([^<]*)/i,                                     AB.replaceTagsAndSpaces);
    getParam(html, result, '__tariff',     /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                       AB.replaceTagsAndSpaces);
    getParam(html, result, 'tarification', /Тарификация:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                         AB.replaceTagsAndSpaces);
    getParam(html, result, 'phone',        /Номер телефона:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                      AB.replaceTagsAndSpaces);
    getParam(html, result, 'sms',          /Остаток SMS:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                         AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, result, 'mms',          /Остаток MMS:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                         AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, result, 'min',          /Пакеты голосовых услуг:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,              AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, result, 'bonus',        /Бонусный баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                     AB.replaceTagsAndSpaces, AB.parseBalance);
    

    var traf = getParam(html, /(?:Мобильный интернет|Остаток GPRS:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    getParam(traf, result, 'traf', /\d+(?:\.\d+)?\s*[гgkкmм][bб]/i, AB.replaceTagsAndSpaces, AB.parseTraffic);

    if(isAvailable('traf') && !result.traf) {

        html = AnyBalance.requestGet(baseurl + 'rest_of_packets/', g_headers)
        AB.getParam(html, result, 'traf', /<b[^>]*>Интернет[\s\S]*?Услуга(?:[^>]*>){10}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseTraffic)
    }

    AnyBalance.setResult(result);
}