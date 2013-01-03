/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте Уральских авиалиний

Сайт оператора: http://www.uralairlines.ru/
Личный кабинет: https://client.uralairlines.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://client.uralairlines.ru/";

    var html = AnyBalance.requestPost(baseurl + 'ffp_client_general.php', {
        login:'1',
        surname:prefs.surname,
        cardissue:prefs.login,
        pincode:prefs.password
    });

    if(!/destroy_client.php/.test(html)){
        html = html.replace(/<!--[\s\S]*?-->/g, '');
        var error = getParam(html, null, null, /<font[^>]*color="red"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Вы набрали\s*<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<font[^>]+color="#006699"[^>]*>((?:[\s\S](?!<\/font>))*?.)<\/font>\s*!/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /ваш персональный счет[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
