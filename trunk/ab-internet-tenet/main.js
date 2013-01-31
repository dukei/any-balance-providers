/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у одесского оператора интернет Tenet

Сайт оператора: http://tenet.ua
Личный кабинет: https://stats.tenet.ua/
*/

function makeFormParams(params){
    var pairs = [];
    for(var i=0; i<params.length; ++i){
        pairs.push(encodeURIComponent(params[i][0]) + '=' + encodeURIComponent(params[i][1]));
    }
    return pairs.join('&');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stats.tenet.ua/";

    var html = AnyBalance.requestGet(baseurl);

    var form = getParam(html, null, null, /<form[^>]+name="wwv_flow"[^>]*>([\s\S]*?)<\/form>/i);
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form, function(params, str, name, value){
        var id = getParam(str, null, null, /\bid="([^"]*)/i, null, html_entity_decode);
        if(id && /USERNAME$/.test(id))
            return prefs.login;
        if(id && /PASSWORD$/.test(id))
            return prefs.password;
        if(name == 'p_request')
            return 'LOGIN';
        return value;
    }, true);

    html = AnyBalance.requestPost(baseurl + 'portal/wwv_flow.accept', makeFormParams(params), {'Content-Type': 'application/x-www-form-urlencoded'});

    if(!/apex_authentication.logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="[^"]*uMessageText[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'fio', /Ф.И.О. владельца[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой Счет:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс на[\s\S]*?Баланс на[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, '__tariff', /<td[^>]+headers="AS_PKT_NAME"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    getParam(html, result, 'status', /Статус ЛС[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'spent', /Оказано услуг[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
