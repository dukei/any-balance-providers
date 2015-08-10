/**
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

    var baseurl = "http://www.avk-wellcom.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'stat_beta/auth/auth/', {
        login:prefs.login,
        password:prefs.password,
        auth:'1',
        x: '19',
        y: '6'
    }, addHeaders({Referer: baseurl + 'stat_beta/auth/auth/'}));

    if(!/stat_beta\/auth\/exit/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="auth_error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'stat_beta/account/info/', g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]*>ФИО:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone1', /<div[^>]*>Домашний телефон:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone2', /<div[^>]*>Мобильный телефон:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<div[^>]*>Текущее состояние лицевого счета: <\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<div[^>]*>Статус счета:<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
