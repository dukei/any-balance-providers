/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для провайдера спутникового интернет и телевидения starblazer.

Сайт оператора: http://starblazer.ru
Личный кабинет: https://billing.starblazer.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://billing.starblazer.ru/";

    var html = AnyBalance.requestPost(baseurl + 'personal/authform/', {
        send:1,
        login:prefs.login,
        password:prefs.password
    });

    if(!/logoff=true/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]*class=["']?errortext[^>]*>([\s\S]*?)<\/font>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /Трафик в этом месяце[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic_tariff', /Трафик с момента смены тарифа[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'speed', /Макс. скорость на тарифе:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'dealer', /Ваш дилер:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Интернет:[\S\s]*?<font[^>]*>([\S\s]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'booster', /Ускоритель Slonax 3G:[\S\s]*?<font[^>]*>([\S\s]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'block', /Блокировка[\S\s]*?<font[^>]*>([\S\s]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер договора:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тариф:[\S\s]*?<td[^>]*>([\S\s]*?)<\/t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
