/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте Копилка

Сайт оператора: http://kopilka-bonus.ru/
Личный кабинет: https://kopilka-bonus.ru/login/
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
    'Connection': 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');
    var baseurl = "https://kopilka-bonus.ru";

    var html = AnyBalance.requestGet(baseurl, g_headers);
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl+'/login/', {
        actmode:'send',
        auth_altMode:1,
        auth_cnumber:'',
        auth_altLogin:prefs.login,
        auth_password:prefs.password
    }, addHeaders ({
        Accept:'application/json, text/javascript, */*; q=0.01',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Referer':baseurl + '/login/'
    }));

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

    if(AnyBalance.isAvailable('total')){
        html = AnyBalance.requestGet(baseurl + '/personal/main/');
        getParam(html, result, 'total', /Сумма покупок в коалиции:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
