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

    var html = AnyBalance.requestGet(baseurl);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + 'userinfo.php', {
        done: 'submit_log',
        pr_login: prefs.login,
        pr_password: prefs.password,
        submit: 'Login'
    });

    if (hasLoginLink(html)) {
        var error = getParam(html, null, null, /<div[^>]*class="[^"]*alert-danger[^"]*">(blocked account[\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error) {
            throw new AnyBalance.Error(error, null, /blocked/i.test(error));
        }

        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /money[\s\S]*?<span\s*class="counter">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'phone', /phone number[\s\S]*?<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'calls', /<span[^>]*>calls<\/span>([\s\S]*?)<\/nobr>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function hasLoginLink(html) {
    return /<button[^>]*value="login"[^>]*>login<\/button>/i.test(html);
}
