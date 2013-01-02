/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у провайдера кардшаринга zargacum.net

Сайт оператора: http://www.zargacum.net
Личный кабинет: https://billing.zargacum.net
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://billing.zargacum.net/";

    var html = AnyBalance.requestPost(baseurl + 'login/', {
        enter_login:prefs.login,
        enter_pwd:prefs.password
    });

    //AnyBalance.trace(html);

    if(!/\/quit\//i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    html = AnyBalance.requestGet(baseurl + 'cabinet/');

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:([\S\s]*?)[\(\|<]/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Тип учетки([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'bonus', /Бонус\s*<[^>]*>\s*:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
