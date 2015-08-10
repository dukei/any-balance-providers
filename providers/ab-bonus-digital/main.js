/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Белый ветер Цифровой

Сайт оператора: http://www.digital.ru
Личный кабинет: http://www.digital.ru/log_in
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.digital.ru/";

    var html = AnyBalance.requestPost(baseurl + 'log_in', {
        _username:prefs.login,
        _password:prefs.password,
        url:baseurl + 'log_in'
    }, {Accept:'application/json, text/javascript, */*; q=0.01', 'X-Requested-With':  'XMLHttpRequest'});

    var json = getJson(html);
    if(json.error)
        throw new AnyBalance.Error(json.error);

    html = AnyBalance.requestGet(baseurl + 'profile');

    var result = {success: true};

    getParam(html, result, 'balance', /Ваши бонусы:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Личные данные[\s\S]*?<div[^>]+class="cabinet-info-item__content[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
