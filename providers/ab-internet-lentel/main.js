/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет-провайдера Ecotelecom.

Сайт оператора: http://www.ecotelecom.ru
Личный кабинет: https://bill.ecotelecom.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://kabinet.lentel.ru/webexecuter";

    var html = AnyBalance.requestPost(baseurl, {
    	midAuth: '0',
        user:prefs.login,
        pswd:prefs.password,
        'x':26,
        'y':9
    });


    if(!/\?action=Exit/i.test(html)){
        var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Договор не найден/i.test(error));
        
    	AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var contractId = getParam(html, null, null, /contractId=(\d+)/);
    if(!contractId)
        throw new AnyBalance.Error("Не удалось найти номер контракта. Личный кабинет изменился или проблемы на сайте.");

    html = AnyBalance.requestGet(baseurl + "?action=GetBalance&mid=contract&contractId="+contractId);

    var result = {success: true};

    getParam(html, result, 'balance', /Исходящий остаток на конец месяца[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'prihod', /Приход за месяц \(всего\)[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'licschet', /Супердоговор:[\s\S]*?<a[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    html = AnyBalance.requestGet(baseurl + "?action=ChangeTariff&mid=contract&contractId="+contractId);
    //Тарифный план в последней строчке таблицы
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*<tr[^>]*>\s*<td[^>]*>\s*<font[^>]*>([^<]*?)<\/font>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
