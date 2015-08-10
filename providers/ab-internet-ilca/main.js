/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у питерского провайдера ИЛКА

Сайт оператора: http://ilca.ru
Личный кабинет: https://bill.ilca.ru/user/
*/

function parseTrafficGb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024*100)/100;
    AnyBalance.trace('Parsed traffic ' + val + ' gb from ' + str);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://bill.ilca.ru/user/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'main.phtml', {
        login:prefs.login,
        passwd:prefs.password,
        action:'Войти'
    });

    if(!/\?action=Logout/i.test(html)){
        var error = getParam(html, null, null, /<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<h2[^<]*Состояние счета([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<h2[^<]*ФИО([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Договор([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Текущий тариф([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'statistics.phtml');
        getParam(html, result, 'trafficIn', /Всего за период(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /Всего за период(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    AnyBalance.setResult(result);
}
