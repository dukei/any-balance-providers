/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и номер счета Яндекс.Деньги

Сайт оператора: https://ssl.easypay.by
Личный кабинет: https://ssl.easypay.by
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Введите номер телефона!");
    if(!prefs.password)
        throw new AnyBalance.Error("Введите пароль!");

    var baseurl = "https://ssl.easypay.by/";

    html = AnyBalance.requestPost(baseurl + 'pay/', {
        mode:'enter',
        login:prefs.login,
        password:prefs.password
    });

    if(!/<input[^>]+name="mode"[^>]*value="exit"/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errorblock"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти. Сайт недоступен или изменен?");
    }

    var result={success: true};

    getParam(html, result, 'balance', /<div[^>]+id="balance_value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /Мой кошелёк №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<div[^>]+class="accountnumber"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
