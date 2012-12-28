/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Белый ветер Цифровой

Сайт оператора: http://www.ozon.ru
Личный кабинет: http://www.ozon.ru/default.aspx?context=login
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://www.ozon.ru/";

    var html = AnyBalance.requestPost(baseurl + 'default.aspx?context=login', {
        LoginType:1,
        LoginGroup:'HasAccountRadio',
        Login:prefs.login,
        Password:prefs.password,
        CapabilityAgree:'on',
        Authentication:'Продолжить',
    });
   
    if(!/\?context=logoff/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="ErrorSpan"[^>]*>([\s\S]*?)<\/span>/i);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    if(AnyBalance.isAvailable('balance', 'blocked', 'available')){
        html = AnyBalance.requestGet(baseurl + '?context=myaccount');
        
        getParam(html, result, 'balance', /Остаток средств на счете[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'blocked', /Заблокировано[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'available', /Доступные средства[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('bonus')){
        html = AnyBalance.requestGet(baseurl + '?context=mypoints');
        getParam(html, result, 'bonus', /Сумма:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    html = AnyBalance.requestGet(baseurl + '?context=myclient');
    getParam(html, result, '__tariff', /<div[^>]+class="big1"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
