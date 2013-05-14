/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для провайдера IP телефонии DoRiN Networks

Operator site: http://dorinet.org/
Личный кабинет: http://dorinet.org/lk.php
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

    var baseurl = "http://dorinet.org/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'lk.php', {
        user:prefs.login,
        pass:prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/exit\.bmp/i.test(html)){
        var error = getParam(html, null, null, /<center[^>]*>([\s\S]*?)<\/center>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /Ф.И.О. пользователя:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<i[^>]*>Баланс:<\/i>\s*<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
