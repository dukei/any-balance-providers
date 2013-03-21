/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс в такси Максим

Operator site: http://taxsee.ru
Личный кабинет: http://www.taxsee.ru/drivercabinet/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.taxsee.ru/drivercabinet/";

    AnyBalance.setDefaultCharset('utf-8'); 
    var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
    
    var form = getParam(html, null, null, /<form[^>]+id="login-form"[^>]*>([\s\S]*?)<\/form>/i);
    var params = createFormParams(form, function(params, str, name, value){
            if(name == 'username')
                return prefs.login;
            if(name == 'password')
                return prefs.password;
            return value;
        });

    html = AnyBalance.requestPost(baseurl + 'index.php', params, addHeaders({Referer: baseurl})); 

    if(!/.>Выход</i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+alert-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var json = getParam(html, null, null, /user_profile\s*=\s*(\{[\s\S]*?\});/, null, getJson);
//    getParam(html, result, 'fio', /ФИО[\s\S]*?<div[^>]+class="controls"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /ФИО[\s\S]*?<div[^>]+class="controls"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Доступный баланс[\s\S]*?<div[^>]+class="controls"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
