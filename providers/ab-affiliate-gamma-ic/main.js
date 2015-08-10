/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у Gamma Investment Corporation.

Сайт оператора: http://www.gamma-ic.ru/
Личный кабинет: http://www.gamma-ic.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.gamma-ic.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        USER_LOGIN:prefs.login,
        USER_PASSWORD:prefs.password,
        x:117,
        y:28,
        backurl:'/enter/',
        AUTH_FORM:'Y',
        TYPE:'AUTH'
    });

    if(!/\/\?logout=yes/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode); 
        if(error){
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'investor/');
    
    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+id="man"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<div[^>]+id="man"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'base', /<li[^>]*>\s*<span[^>]*>([^<]*)<\/span>\s*<p[^>]*>\s*Инвестировано:/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'income', /<li[^>]*>\s*<span[^>]*>([^<]*)<\/span>\s*<p[^>]*>\s*Прибыль:/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'out', /<li[^>]*>\s*<span[^>]*>([^<]*)<\/span>\s*<p[^>]*>\s*Выведено:/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'dep', /<li[^>]*>\s*<span[^>]*>([^<]*)<\/span>\s*<p[^>]*>\s*Текущий депозит:/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pct', /<li[^>]*>\s*<span[^>]*>([^<]*)<\/span>\s*<p[^>]*>\s*Доход на/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
