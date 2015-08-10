/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте Копилка

Сайт оператора: http://kopilka-bonus.ru/
Личный кабинет: https://kopilka-bonus.ru/login/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://kopilka-bonus.ru/";

    var html = AnyBalance.requestGet(baseurl + 'login/');

    html = AnyBalance.requestPost(baseurl + 'login/', {
        actmode:'send',
        auth_altMode:0,
        auth_cnumber:prefs.login,
        auth_altLogin:'',
        auth_password:prefs.password
    }, {
        Accept:'application/json, text/javascript, */*; q=0.01',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Referer':baseurl + 'login/',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17',
        'X-Requested-With':'XMLHttpRequest'
    });

    var url = getParam(html, null, null, /<meta[^>]+http-equiv="refresh"[^>]*url=([^"]*)/i, null, html_entity_decode);

    if(!url){
        var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось получить баланс карты. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(url);

    var result = {success: true};

    getParam(html, result, 'cardnum', /<span[^>]+class=['"]?pan[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<span[^>]+class=['"]?bonus[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<span[^>]+class=['"]?pan[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('')){
        html = AnyBalance.requestGet(baseurl + 'personal/main/');
        getParam(html, result, 'total', /Сумма покупок в коалиции:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
