/**
Компания Автодор, занимающаяся оплату за проезд по платным дорогам (http://any-balance-providers.googlecode.com)

Получает баланс из личного кабинета компании Автодор 

Сайт: http://avtodor-ts.ru/
Личный кабинет: http://avtodor-ts.ru/user/login
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

    var baseurl = 'http://avtodor-tr.ru/';

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'user/login', {
        "LoginForm[username]":prefs.login,
        "LoginForm[password]":prefs.password,
        yt0:'Войти'
    }, addHeaders({Referer: baseurl + 'about'})); 

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="block_thanks"[^>]*>[\s\S]*?<div[^>]+class="text"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        console.log(error);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="name_u"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс\s*:[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /Договор\s*:[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'email', /логин\)\s*:\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
