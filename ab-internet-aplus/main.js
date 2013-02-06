/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у белорусского оператора интернет АйчынаПлюс

Сайт оператора: http://aplus.by
Личный кабинет: https://cp.aplus.by
*/

function parseDateMoment(str){
    var mom = moment(str, ['D MMM YYYY в HH:mm', 'D MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://cp.aplus.by/";
    moment.lang('ru');

    var html = AnyBalance.requestPost(baseurl + 'login', {
        username:prefs.login,
        password:prefs.password
    });

    AnyBalance.trace(html.length);
    if(html.length){
        var error = getParam(html, null, null, /<div[^>]*class="error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'customer_page');

    if(!/customer_page\/logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'fio', /<div[^>]+class="customerName"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /<div[^>]+class="accountNumber"[^>]*>[^<]*?№([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<div[^>]+class="balance"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    var serviceItem = getParam(html, null, null, /<div[^>]+class="serviceItem"[^>]*>\s*<table[^>]*>([\s\S]*?)<\/table>/i);
    if(serviceItem){
        getParam(serviceItem, result, '__tariff', /<td[^>]+class="serviceTariffName"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(serviceItem, result, 'till', /Пакет истекает([^<]*)/i, replaceTagsAndSpaces, parseDateMoment);
        getParam(serviceItem, result, 'status', /<div[^>]+class="serviceStatus"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        var id = getParam(serviceItem, null, null, /customer_page\/radius_report\/(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
        if(id && AnyBalance.isAvailable('trafficIn', 'trafficOut')){
            var now = new Date();
            html = AnyBalance.requestGet(baseurl + 'customer_page/radius_report/' + id + '/?sy=' + now.getFullYear() + '&sm=' + (now.getMonth() + 1) + '&sd=1&ey=' + now.getFullYear() + '&em=' + (now.getMonth() + 1) + '&ed=' + now.getDate());
            getParam(html, result, 'trafficOut', /исходящий(?:&nbsp;|\s)*&rarr;([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
            getParam(html, result, 'trafficIn', /входящий(?:&nbsp;|\s)*&larr;([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        }
    }

    AnyBalance.setResult(result);
}
