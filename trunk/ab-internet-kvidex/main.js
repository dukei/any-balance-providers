/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет-провайдера Kvidex.

Сайт оператора: http://kvidex.ru/
Личный кабинет: https://stat.kvidex.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://stat.kvidex.ru";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password
    });

    var error = getParam(html, null, null, /<h2>Ошибка<\/h2><p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'userName', /<strong>Абонент<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /<strong>Лицевой счет<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /<strong>Баланс<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<strong>Интернет<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<strong>Тарифный план<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', /<strong>Стоимость<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'trafficIn', /<strong>Входящий трафик<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'trafficOut', /<strong>Исходящий трафик<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseTraffic);

    AnyBalance.setResult(result);
}
