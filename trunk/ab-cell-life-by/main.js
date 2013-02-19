/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Life:) — GSM оператор мобильной связи Белоруссия.
Сайт оператора: http://www.life.com.by/
Интернет Система Самообслуживания Абонентов (ИССА): https://my.life.com.by/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://issa.life.com.by/';
    var matches = prefs.login.match(/^(\d\d)(\d{7})$/);
    if(!matches)
        throw new AnyBalance.Error('Пожалуйста, введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей.');
        
    var html=AnyBalance.requestPost(baseurl, {
        Code: matches[1],
        Phone: matches[2],
        password: prefs.password
    });
    
    if(!/\/Account.aspx\/Logoff/i.test(html)){
        var error = getParam(html, null, null, /<div class="validation-summary-errors errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {
        success: true
    };
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий основной баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_bonus', /Текущий бонусный баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('traffic_left')){
        html = AnyBalance.requestGet(baseurl + 'User.aspx/Index');
        var table = getParam(html, null, null, /Остаток пакетов:[\s\S]*<table[^>]+class="longinfo"[^>]*>([\s\S]*?)<\/table>/i);
        if(table){
            sumParam(html, result, 'traffic_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr|НОЧНОЙ))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:[мmkкгg][бb]|байт|byte)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
            sumParam(html, result, 'min_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:мин|min)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            sumParam(html, result, 'traffic_night_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr))*?НОЧНОЙ(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:[мmkкгg][бb]|байт|byte)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
        }else{
            AnyBalance.trace('Информация по пакетам не найдена.');
        }
    }

    AnyBalance.setResult(result);
}