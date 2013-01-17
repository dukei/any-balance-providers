/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у эстонского провайдера сотовой связи Elisa

Сайт оператора: http://minu.elisa.ee/konekaart
Личный кабинет: http://minu.elisa.ee/konekaart/ru/itb/logi-sisse
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://minu.elisa.ee/konekaart/";

    var langs = {
        ru: 'ru',
        et: 'et'
    }

    var lang = langs[prefs.lang] || 'ru';
    baseurl += lang + '/';

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'itb/logi-sisse', {
        username:prefs.login,
        password:prefs.password,
        login:'login'
    });

    if(!/<h1[^>]*>Информация карты|Kõnekaardiinfo<\/h1>/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="msg-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    var result = {success: true};

    var num = prefs.num || '\\d+';

    var re = new RegExp('<tr[^>]*>\\s*<td[^>]*>(?:[\\s\\S](?!</td>))*?' +  num + '(?:\\s|<[^>]*>)*?</td>[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти телефона с последними цифрами ' + num : 'Не удалось найти ни одного телефона');

    getParam(tr, result, 'phone', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'daysleft', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
