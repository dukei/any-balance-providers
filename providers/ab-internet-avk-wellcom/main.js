﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для интернет провайдера АВК-ВЕЛЛКОМ 

Operator site: http://www.avk-wellcom.ru/
Личный кабинет: http://www.avk-wellcom.ru/stat_beta/auth/auth/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://lk.avk-wellcom.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'auth/auth/', g_headers);
    if(/403/i.test(AnyBalance.getLastUrl())){
    	var error = getElement(html, /<body[^>]*>/i, replaceTagsAndSpaces);
    	if(error)
    		throw new AnyBalance.Error(error);
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Доступ запрещен. Сайт изменен?');
    }

    var html = AnyBalance.requestPost(baseurl + 'auth/auth/', {
        login:prefs.login,
        password:prefs.password,
        auth:'1',
        x: '19',
        y: '6'
    }, addHeaders({Referer: baseurl + 'auth/auth/'}));

    if(!/lk\/auth\/exit/i.test(html)){
        var error = getParam(html, /<div[^>]+id="auth_error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'account/info/', g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]*>ФИО:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'phone1', /<div[^>]*>Домашний телефон:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'phone2', /<div[^>]*>Мобильный телефон:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /<div[^>]*>Текущее состояние лицевого счета: <\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<div[^>]*>Статус счета:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
