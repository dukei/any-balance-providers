/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://issa-tomsk.bwc.ru/cgi-bin/cgi.exe";

    var html = AnyBalance.requestPost(baseurl + '?function=is_login', {
        mobnum:prefs.login,
        Password:prefs.password,
        submit_button:'Войти'
    });

    var error = getParam(html, null, null, /<td[^>]*class=["']?error[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    html = AnyBalance.requestGet(baseurl + '?function=is_account');

    //AnyBalance.trace(html);
    if(!/\?function=is_exit/.test(html)){
        var error = getParam(html, null, null, /<p[^>]*style=["']color:\s*red[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Актуальный баланс:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'promise', /Действующий обещанный платеж:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'avg', / Средняя скорость расходования средств по лицевому счету в день:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'daysleft', /Предположительная дата отключения без поступления средств[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счет\s*-([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Номер телефона\s*-([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    var packets = getParam(html, null, null, /<h2[^>]*>\s*Общая продолжительность разговоров[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
    if(packets){
    	sumParam(packets, result, 'traffic_left', /<tr[^>]*>(?:(?:[\s\S](?!<\/tr))*?<td[^>]*>){2}[^<]*(?:\d+ [МГ]Б|интернет)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, [/\(мегабайт\)/i, 'мб', /\(гигабайт\)/i, 'гб', replaceTagsAndSpaces], parseTraffic, aggregate_sum);
    }else{
        AnyBalance.trace('Не удалось получить таблицу доп. услуг');
    }

    html = AnyBalance.requestGet(baseurl + "?function=is_tarif&inf=3");

    getParam(html, result, 'status', /Текущее состояние[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
