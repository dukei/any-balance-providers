 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    
    var result = {success: true};
	
    html = AnyBalance.requestGet(baseurl + 'finance/client_info', g_headers);

    getParam(html, result, 'balance', /<span[^>]+id="balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<span[^>]+id="client_name"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'number', /<select[^>]+name="service"[^>]*>(?:[\s\S](?!<\/select>))*?<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /<span[^>]+id="ConnectionStatus"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<span[^>]+id="tmName"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
