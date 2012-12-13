/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте s7

Сайт оператора: http://www.s7.ru
Личный кабинет: https://www.s7.ru/home/priority/ffpAbout.dot
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://www.s7.ru/";

    var html = AnyBalance.requestPost(baseurl + 'cas/login', {
        renew:true,
        auto:true,
        service:baseurl + 'home/priority/ffpAbout.dot',
        errorPage:baseurl + 'home/priority/ffpLoginError.dot',
        hiddenText:'',
        username:prefs.login,
        password:prefs.password
    });

    var params = createFormParams(html, function(params, str, name, value){
        if(/type="(submit|reset)"/i.test(str))
            return;
        if(name == 'username')
            return prefs.login;
        if(name == 'password')
            return prefs.password;
        return value;
    });

    html = AnyBalance.requestPost(baseurl + 'cas/login', params);

    //AnyBalance.trace(html);
    if(!/priority\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /(?:Мили|Miles):[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardnum', /(?:Номер|Number):[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /(?:Статус|Status):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'userName', /<div[^>]+class="ffp_username"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

    var cn = getParam(html, null, null, /(?:Номер|Number):[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    var status = getParam(html, null, null, /(?:Статус|Status):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    result.__tariff = status + ', №' + cn;

    if(AnyBalance.isAvailable('qmiles', 'flights')){
        html = AnyBalance.requestGet(baseurl + 'home/priority/ffpMyMiles.dot');
        getParam(html, result, 'qmiles', /<td[^>]+class="balance"[^>]*>([\s\S]*?)(?:<\/td>|\/)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'flights', /<td[^>]+class="balance"[^>]*>[^<]*\/([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
