/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет провайдера Mosnet

Сайт оператора: http://mosnet.ru
Личный кабинет: https://privateoffice.mosnet.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://privateoffice.mosnet.ru/index.php?";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password,
        authorise:'Вход в личный кабинет'
    }, {Referer:baseurl});

    if(!/page=exit/i.test(html)){
        var error = getParam(html, null, null, /Возникли ошибки\s*:[\s\S]*?<div[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'fio', /<input[^>]+name="fio"[^>]*value="([^"]*)"/i, null, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'load_page=contracts');
    getParam(html, result, '__tariff', /<table[^>]+class="tariff"(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('licschet', 'balance', 'debt')){
        html = AnyBalance.requestGet(baseurl + 'load_page=account_data');
        
        getParam(html, result, 'licschet', /<th[^>]*>Лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'balance', /<th[^>]*>Доступный остаток[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'debt', /<th[^>]*>Задолженность по обещанным платежам[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'load_page=statistic');
        var table = getParam(html, null, null, /<h2[^>]*>Интернет-трафик за[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
        if(table){
            //Последняя строчка
            var tr = getParam(table, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?.<\/tr>\s*$/i);
            if(tr){
                getParam(tr, result, 'trafficIn', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
                getParam(tr, result, 'trafficOut', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
            }
        }
    }

    AnyBalance.setResult(result);
}
