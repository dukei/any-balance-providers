/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Кегельбум

Сайт оператора: http://www.kegelbum.ru
Личный кабинет: www.kegelbum.ru/login/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.kegelbum.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login/?login=yes', {
        AUTH_FORM:'Y',
        TYPE:'AUTH',
        backurl:'/login/',
        USER_LOGIN:prefs.login,
        USER_PASSWORD:prefs.password,
        Login:'Вход'
    });

    if(!/logout=yes/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errortext"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestPost(baseurl + 'personal/cards/');

    var result = {success: true};

    getParam(html, result, 'fio', /<div[^>]+class="welcome"[^>]*>\s*Здравствуйте,([\s\S]*?)!?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    sumParam(html, result, 'balance_total', /<td[^>]+class="balance"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    var num = prefs.num ? prefs.num : "\\d+";
    var re = new RegExp('<tr[^>]+card-id="\\d*' + num + '"[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);

    getParam(tr, result, 'balance', /<td[^>]+class="balance"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cardnum', /<td[^>]+class="cnumber"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'status', /<td[^>]+class="status"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<td[^>]+class="cnumber"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
