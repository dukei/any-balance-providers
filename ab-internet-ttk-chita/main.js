/**
Провайдер ТТК-Чита (http://any-balance-providers.googlecode.com)
*/

function parseTrafficMy(str){
    return parseTrafficGb(str, 'b');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.ttk-chita.ru/bgbilling/webexecuter";

    var html = AnyBalance.requestPost(baseurl, {
        midAuth:0,
        user:prefs.login,
        pswd:prefs.password
    });
	
    if(!/\?action=Exit/i.test(html)){
        var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)(?:<\/ul>|<\/div>)/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
			
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};
    
    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + '?action=ShowBalance&mid=contract');
        getParam(html, result, 'balance', /Исходящий остаток[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    html = AnyBalance.requestGet(baseurl + '?action=ChangeTariff&mid=contract');
    var plans = getParam(html, null, null, /<td>Тарифный план[\s\S]*?<tbody[^>]*>([\S\s]*?)<\/tbody>/i);
    if(plans){
        sumParam(plans, result, '__tariff', /<td><font>([\S\s]*?)<\/font>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    }

    if(AnyBalance.isAvailable('traffic_time', 'traffic_cost', 'traffic_total')){
        html = AnyBalance.requestGet(baseurl + '?action=ShowLoginsBalance&mid=1&module=dialup');
        
        getParam(html, result, 'traffic_time', /Итого:(?:[\S\s]*?<td[^>]*>){2}[\S\s]*?\[(\d+)\]/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'traffic_cost', /Итого:(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'traffic_total', /Итого:(?:[\S\s]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficMy);
    }
    
    AnyBalance.setResult(result);
}
