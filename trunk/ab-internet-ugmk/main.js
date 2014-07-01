/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для УГМК телеком - крупного оператора современных услуг связи, работающий на рынке телекоммуникаций, более чем в 20 населенных пунктах Урала, Сибири, Башкирии и Центральной России.

Сайт оператора: http://ugmk-telecom.ru/
Личный кабинет: https://stats.ugmk-telecom.ru
*/

function parseTrafficTotalGb(str){
     var traffics = str.split(/\//g);
     var total;
     for(var i=0; i<traffics.length; ++i){
         var val = parseBalance(traffics[i]);
         if(typeof(val) != 'undefined')
             total = (total || 0) + val;
     }
     
     total = total && parseFloat((total/1024).toFixed(2));
     AnyBalance.trace('Parsed total traffic ' + total + ' Gb from ' + str);
     return total;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stats.ugmk-telecom.ru/bgbilling/webexecuter";

    var html = AnyBalance.requestPost(baseurl, {
        midAuth:0,
        user:prefs.login,
        pswd:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/\?action=Exit/i.test(html)){
        var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)(?:<\/ul>|<\/div>)/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};
    
    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + '?action=ShowBalance&mid=contract');
        getParam(html, result, 'balance', /Исходящий остаток[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'promise', /<th[^>]*>\s*Обещанный платеж[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    html = AnyBalance.requestGet(baseurl + '?action=ChangeTariff&mid=contract');
    var plans = getParam(html, null, null, /<td>Тарифный план[\s\S]*?<tbody[^>]*>([\S\s]*?)<\/tbody>/i);
    if(plans){
        sumParam(plans, result, '__tariff', /<td><font>([\S\s]*?)<\/font>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    }
/*
    if(AnyBalance.isAvailable('traffic_time', 'traffic_cost', 'traffic_total')){
        html = AnyBalance.requestGet(baseurl + '?action=ShowLoginsBalance&mid=6&module=dialup');
        
        getParam(html, result, 'traffic_time', /Итого:(?:[\S\s]*?<td[^>]*>){2}[\S\s]*?\[(\d+)\]/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'traffic_cost', /Итого:(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'traffic_total', /Итого:(?:[\S\s]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficTotalGb);
    }
*/    
    AnyBalance.setResult(result);
}
