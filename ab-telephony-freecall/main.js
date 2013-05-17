/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для сотового оператора xxxxxx 

Operator site: http://xxxxxx.ru
Личный кабинет: https://kabinet.xxxxxx.ru/login
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

    var baseurl = "https://www.freecall.com/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    var form = getParam(html, null, null, /<form[^>]*>([\s\S]*?)<\/form>/i);    
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form);
    params["login[username]"] = prefs.login;
    params["login[password]"] = prefs.password;
    
    html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl})); 

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="notification error png_bg"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /Your credit[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance'], /Your credit[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseMyCurrency);
    getParam(html, result, 'freedays', /Freedays:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function parseMyCurrency(text){
    var val = getParam(html_entity_decode(text), null, null, null, [/\s+/g, '', /[\d\.,\-]/g, '']);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}