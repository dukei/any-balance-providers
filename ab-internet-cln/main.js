/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет провайдера CLN (Convergent Local Networks).

Сайт оператора: http://cln.net
Личный кабинет: https://billing.cln.net
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://billing.cln.net/";

    var html = AnyBalance.requestPost(baseurl, {
        pin4821: prefs.login,
        pwd0976: prefs.password,
        login: 'Вход'
    }, {Referer:baseurl});

    if(!/,\s*'logout'/i.test(html)){
        var error = getParam(html, null, null, /<small[^>]*>Ошибка[\s\S]*?<table[^>]*>([\S\s]*?)(?:<button|<\/table>)/i, [/Выход/, 'Вход', replaceTagsAndSpaces], html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'userName', /<table[^>]+id=["']t_ID_data["'][\s\S]*?<td[^>]*>([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<table[^>]+id=["']t_balance["'][^>]*>([\s\S]*?)<\/table>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'lastpaysum', /<table[^>]+id=["']t_lastpay["'](?:(?:[\s\S](?!<\/table>))*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>)([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastpaydate', /<table[^>]+id=["']t_lastpay["'](?:(?:[\s\S](?!<\/table>))*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'lastpaydesc', /<table[^>]+id=["']t_lastpay["'](?:(?:[\s\S](?!<\/table>))*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, '__tariff', /<th[^>]*>Тариф\s*<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /<th[^>]*>Тариф\s*<(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<th[^>]*>Тариф\s*<(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'quota', /<th[^>]*>Тариф\s*<(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /<th[^>]*>Тариф\s*<(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)(?:<td|<\/td>|<\/table>)/i, replaceTagsAndSpaces, parseTrafficGb);

    AnyBalance.setResult(result);
}
