/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора AKOS (Ростелеком).

Сайт оператора: https://issa.akos.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "https://issa.akos.ru/cgi-bin/cgi.exe?";

    AnyBalance.trace("Trying to enter issa at address: " + baseurl + "function=is_login");
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
        mobnum: prefs.login,
        Password: prefs.password
    });
    
    var error = getParam(html, null, null, /<td[^>]+class=['"]?error[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error){
        throw new AnyBalance.Error(error);
    }

    var result = {success: true};
    
    html = AnyBalance.requestGet(baseurl + "function=is_account");
    if(!/\?function=is_exit/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    getParam(html, result, 'balance', /Актуальный баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'average_speed', /Средняя скорость расходования средств по лицевому счету в день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var tableCounters = getParam(html, null, null, /Общая продолжительность разговоров[\s\S]*?<table[^>]*?>([\s\S]*?)<\/table>/i);
    if(tableCounters){
        sumParam(tableCounters, result, 'min', /<td[^>]*?>([^<]*\(мин[^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        sumParam(tableCounters, result, 'traffic', /<td[^>]*?>([^<]*\((?:байт|мб|кб|гб)[^<]*)<\/td>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    }

    getParam(html, result, '__tariff', /issa\/tariff\.gif[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); 
    
    AnyBalance.setResult(result);
}
