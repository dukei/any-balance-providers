/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у российского провайдера IP телефонии Alloincognito

Сайт оператора: http://alloincognito.ru/
Личный кабинет: https://my.alloincognito.ru/clients/?sc=allo
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://my.alloincognito.ru/clients/";
    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestPost(baseurl + '?sc=allo', {
        sc:'allo',
        action:',go',
        'interface':'AUTO',
        prefix:prefs.prefix,
        login:prefs.login,
        password:prefs.password
    });

    if(!/\?action=logout/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="errortext"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'skel.cgi?sc=allo&action=setup');
    getParam(html, result, 'phone', /Ваш «Инкогнито номер»:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Ваш «Инкогнито номер»:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<th[^>]*>\s*Абонент[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + 'skel.cgi?sc=allo&action=detal');

        getParam(html, result, 'balance', /Остаток на счете:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
