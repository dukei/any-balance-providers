/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у провайдера IP Callbacker

Сайт оператора: http://callbacker.com
Личный кабинет: https://customer.callbacker.com/cabinet/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://customer.callbacker.com/cabinet/";
    AnyBalance.setDefaultCharset('utf-8');

    AnyBalance.setCookie('customer.callbacker.com', 'ui_language', 'english');

    var html = AnyBalance.requestPost(baseurl + 'userinfo.php', {
        done:'submit_log',
        pr_login:prefs.login,
        pr_password:prefs.password,
        submit:'Войти'
    });

    if(!/logout.php\?logout=true/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color="red"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Balance:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'phone', /Phone:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Account number:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
