/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у питерского оператора интернет Арбитал

Сайт оператора: http://arbital.ru
Личный кабинет: http://my.arbital.ru/
*/

function parseTrafficGbMy(str){
    return parseTrafficGb(str, 'mb');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://my.arbital.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        auth_name:prefs.login,
        auth_pass:prefs.password,
        submit: 'Отправить'
    });

    if(!/<li[^>]*>\s*<a[^>]+href=["'][^"']*\?logout=true/i.test(html)){
        var error = getParam(html, null, null, /<h4[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'fio', /Пользователь[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<td[^>]*>Тариф<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<td[^>]*>Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /<td[^>]*>Кредит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<td[^>]*>Интернет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /<td[^>]*>Денег на балансе хватит до[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'traffic.php');
        var table = getParam(html, null, null, /<h4[^>]*>Отчеты по месяцам[\s\S]*?<table[^>]*>([\s\S]*?<\/table>)/i);
        if(!table)
            AnyBalance.trace('Не удалось найти таблицу трафика');
        else{
            //Получаем последнюю строчку в таблице
            getParam(table, result, 'trafficIn', /<td[^>]*>((?:[\s\S](?!<\/td>))*?.)<\/td>\s*<td[^>]*>(?:[\s\S](?!<\/td>))*?.<\/td>\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseTrafficGbMy);
            getParam(table, result, 'trafficOut', /<td[^>]*>((?:[\s\S](?!<\/td>))*?.)<\/td>\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseTrafficGbMy);
        }
    }

    AnyBalance.setResult(result);
}
