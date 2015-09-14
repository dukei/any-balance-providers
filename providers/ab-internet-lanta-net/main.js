/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для тамбовского интернет-провайдера LanTa

Сайт оператора: http://www.lanta-net.ru/
Личный кабинет: https://stat.lanta-net.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.lanta-net.ru/nbilling-user/login.jsf";

    var html = AnyBalance.requestGet(baseurl);
    var viewstate = getParam(html, null, null, /<input[^>]*name="javax.faces.ViewState"[^>]*value="([^"]*)/i);
    var submitname = getParam(html, null, null, /<input[^>]*type="submit"[^>]*name="([^"]*)/i);

    var params = {
        loginform:'loginform',
        login:prefs.login,
        passwd:prefs.password,
        'javax.faces.ViewState':viewstate
    };
    params[submitname] = 'Войти';

    html = AnyBalance.requestPost(baseurl, params);

    //AnyBalance.trace(html);
    if(!/\/close\.png/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]*class=["']errors[^>]*>([\s\S]*?)<\/ul>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    //В настоящий момент
    getParam(html, result, 'balance', /&#1042; &#1085;&#1072;&#1089;&#1090;&#1086;&#1103;&#1097;&#1080;&#1081; &#1084;&#1086;&#1084;&#1077;&#1085;&#1090;:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Текущий тарифный план:
    getParam(html, result, '__tariff', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Абонентская плата:
    getParam(html, result, 'abon', /&#1040;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1089;&#1082;&#1072;&#1103; &#1087;&#1083;&#1072;&#1090;&#1072;:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Входящий трафик
    getParam(html, result, 'trafficIn', /&#1042;&#1093;&#1086;&#1076;&#1103;&#1097;&#1080;&#1081; &#1090;&#1088;&#1072;&#1092;&#1080;&#1082;:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    //Исходящий трафик
    getParam(html, result, 'trafficOut', /&#1048;&#1089;&#1093;&#1086;&#1076;&#1103;&#1097;&#1080;&#1081; &#1090;&#1088;&#1072;&#1092;&#1080;&#1082;:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    //Бонусный баланс
    getParam(html, result, 'bonus', /&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
