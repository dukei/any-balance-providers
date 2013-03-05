/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у питерского оператора интернет SkyNet.

Сайт оператора: http://www.sknt.ru/
Личный кабинет: http://bill.sknt.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "http://bill.sknt.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password,
        x:41,
        y:16,
        action:'authorize'
    });

    if(!/action=auth_exit/i.test(html)){
        var error = getParam(html, null, null, /div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode); 
        if(error){
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + '?cat=bl_user');
    getParam(html, result, 'fio', /ФИО:\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    var table = getParam(html, null, null, /<div[^>]*class="st_tc"[^>]*>\s*<table[^>]*>([\s\S]*?)<\/table>/i);
    if(table){
        sumParam(table, result, '__tariff', /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    }
     
    getParam(html, result, 'licschet', /Ваш ID:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Состояние лицевого счета:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + '?cat=bl_user_t');

        getParam(html, result, 'trafficIn', /Итого\s*:(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /Итого\s*:(?:[\s\S]*?<th[^>]*>){2}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    AnyBalance.setResult(result);
}
