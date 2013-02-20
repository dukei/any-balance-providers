/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Ulmart

Сайт оператора: http://ulmart.ru
Личный кабинет: http://www.ulmart.ru/cabinet/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.ulmart.ru/";

    var html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
        j_username:prefs.login,
        j_password:prefs.password,
        _spring_security_remember_me:''
    });

    if(!/\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="loginErrorDiv"[^>]*>([\s\S]*?)(?:Проверьте состояние|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<span[^>]+id="user_popup_bonus"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<div[^>]+class="[^"]*_login"[^>]*>([\s\S]*?)(?:▼|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'price', /цена&nbsp;(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="b-dropdown-popup__info"[^>]*>(?:[\s\S](?!<\/div>))*?<br[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
