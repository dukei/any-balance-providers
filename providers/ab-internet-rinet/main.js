/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences(),
        baseurl = "https://ctl.rinet.ru/cgi-bin/uctl.cgi";
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl, g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var html = AnyBalance.requestPost(baseurl, {
        user: prefs.login,
        passwd: prefs.password,
        mode: 1,
        cmd: 0,
        x: 28,
        y: 14
    }, addHeaders({Referer: baseurl}));

    if(!/\/cgi-bin\/uctl.cgi\?mode=255/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="warning"[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    //getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс[\s\S]+?<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'abon', /Абонентская плата[\s\S]+?<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'status', /Состояние счета:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'trafficIn', /Трафик[\s\S]*?Итого(?:[\S\s]*?<div[^>]*>){5}([\S\s]*?)<\/div>/i, replaceFloat, function(traffic){ return parseTrafficGb(traffic, 'Мб') });
    getParam(html, result, 'trafficOut', /Трафик[\s\S]*?Итого(?:[\S\s]*?<div[^>]*>){11}([\S\s]*?)<\/div>/i, replaceFloat, function(traffic){ return parseTrafficGb(traffic, 'Мб') });
    
    AnyBalance.setResult(result);
}