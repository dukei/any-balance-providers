/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора НТК.

сайт оператора: http://www.vntc.ru
ИССА оператора: https://issa.vntc.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "https://issa.volgogsm.ru/cgi-bin/cgi.exe?";

    AnyBalance.trace("Trying to enter issa at address: " + baseurl + "function=is_login");
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
        mobnum: prefs.login,
        Password: prefs.password
    });
    
    var error = getParam(html, null, null, /<table[^>]+class=['"]?centorize-td[^>]*>([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error){
        throw new AnyBalance.Error(error);
    }

    var result = {success: true};
    
    html = AnyBalance.requestGet(baseurl + "function=is_account");
    if(!/\?function=is_exit/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    getParam(html, result, 'ActualBalance', /Актуальный баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'DayRashod', /Средняя скорость расходования средств по лицевому счету в день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'BonusBalance', /Количество бонусных баллов на счету:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'MinBalabce', /Минимальный баланс для подключения:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'DateOff', /Предположительная дата отключения без поступления средств менее, чем через:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    sumParam(html, result, 'sms', /остаток Бонус (?:&quot;|")\d+ SMS(?:&quot;|") составляет (\d+) SMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'sms', /у Вас остаток (\d+) для услуги Бонус (?:&quot;|")\d+ SMS(?:&quot;|")/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'min', /накоплено исходящий трафик составляет (\d+) мин/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    getParam(html, result, '__tariff', /issa\/tariff\.gif[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); 
    
    AnyBalance.setResult(result);
}
