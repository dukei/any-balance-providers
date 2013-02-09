/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает доход в финансовой пирамиде ПО-РЕГИОНЫ (http://11region.com).

Сайт оператора: http://11region.com
Личный кабинет: http://11region.com/cabinet/index/main
*/

var g_baseurl = "http://11region.com/cabinet/";
var g_headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control':'max-age=0',
        'Connection':'keep-alive',
        'Referer':g_baseurl,
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = g_baseurl;

    var html = AnyBalance.requestPost(baseurl + 'index/login', {
        'app_modules_cabinet_forms_Login[login]':prefs.login,
        'app_modules_cabinet_forms_Login[password]':prefs.password,
        cms0:''
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/index\/logout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="help-block"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /В ПО-РЕГИОНЫ вы заработали:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Вы вошли как:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
