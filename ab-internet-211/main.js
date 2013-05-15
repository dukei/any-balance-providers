/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у новосибирского интернет провайдера Сибирские Сети

Сайт оператора: http://211.ru
Личный кабинет: http://passport.211.ru/
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "http://passport.211.ru";

    var html = AnyBalance.requestGet(baseurl + '/user/index', g_headers);
    if(!prefs.__debug){
        html = AnyBalance.requestPost('http://header.211.ru/', {
            retpath: baseurl,
            login:prefs.login,
            password:prefs.password
        }, addHeaders({Referer: baseurl + '/user/index'}));
    }

    var href = getParam(html, null, null, /(\/logout)/i);
    if(!href){
        var error = sumParam(html, null, null, /<span[^>]*class="input-message"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в паспорт! Изменения на сайте?");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<a[^>]*class="header-balance-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Ваш тариф:([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'bonus', /<a[^>]*class="header-bonus-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
