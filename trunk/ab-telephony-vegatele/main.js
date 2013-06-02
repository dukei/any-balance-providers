 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

VEGA — телефонная фиксированная связь в городах Украины
Сайт оператора: http://www.vegatele.com
Личный кабинет: https://my.vegatele.com

*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = "https://my.vegatele.com/";
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    var token = getParam(html, null, null, /<input[^>]+name="csrf_token"[^>]*value="([^"]*)/i);
    if(!token)
       throw new AnyBalance.Error('Не удаётся найти форму входа. Проблемы на сайте или сайт изменен.');

    html = AnyBalance.requestPost(baseurl + 'auth/login', {
        csrf_token:token,
        login_method:prefs.login_method,
        login:prefs.login,
        password:prefs.password,
        'submit.x':16,
        'submit.y':14,
        submit:'submit'
    }, addHeaders({Referer: baseurl + 'login'}));

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]*class=["']red\s*-small[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
    
    var result = {
        success: true
    };

    var dogid = getParam(html, null, null, /<input[^>]+id="hdogid"[^>]*value="([^"]*)/i);
    if(!dogid)
        throw new AnyBalance.Error('Не удалось получить номер лицевого счета. Сайт изменен?');

    html = AnyBalance.requestGet(baseurl + 'cabinet/url_get_services/' + dogid + '/' + Math.random(), g_headers);
    var json = getJson(html);
    if(json.error)
        throw new AnyBalance.Error(json.error);

    if(AnyBalance.isAvailable('balance'))
        result.balance = Math.round(json.balance.balance*100)/100;

    if(AnyBalance.isAvailable('fio'))
        result.fio = json.ClientName;

    for(var i=0; i<json.services.length; ++i){
        var service = json.services[i];
        if(!prefs.number || service.name_conn == prefs.number){
            if(AnyBalance.isAvailable('number'))
                result.number = service.name_conn;
            if(AnyBalance.isAvailable('status'))
                result.status = service.status == '0' ? 'Активна' : 'Не активна';
            result.__tariff = service.tm_name;
            break;
        }
    }

    AnyBalance.setResult(result);
}
