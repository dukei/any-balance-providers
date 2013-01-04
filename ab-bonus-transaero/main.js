/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте Транаэро

Сайт оператора: http://transaero.ru/
Личный кабинет: http://transaero.ru/ru/privilege/argo-login
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://transaero.ru";

    var html = AnyBalance.requestGet(baseurl + '/ru/privilege/argo-login');
    var action = getParam(html, null, null, /<form[^>]+action="(\/wps\/portal\/!ut[^"]*)/i, null, html_entity_decode);
    if(!action)
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен или проблемы на сайте.');

    html = AnyBalance.requestPost(baseurl + action, {
        FORM_LASTNAME:prefs.surname,
        FORM_CARDNO:prefs.login,
        FORM_PINCODE:prefs.password,
        ArgoPortletFormSubmit:'Войти'
    });

    if(!/Возврат на страницу авторизации/i.test(html)){
        var error = getParam(html, null, null, /<h1[^>]*>Просмотр состояния счёта<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Вы набрали\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Уважаемый([^<!]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /ваш персональный счет([^<\.]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
