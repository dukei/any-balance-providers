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
    var html = AnyBalance.requestGet(baseurl + 'ua/auth/login', g_headers);
    var token = getParam(html, null, null, /<input[^>]+name="_csrf"[^>]*value="([^"]*)/i);
    if(!token)
       throw new AnyBalance.Error('Не удаётся найти форму входа. Проблемы на сайте или сайт изменен.');

    html = AnyBalance.requestPost(baseurl + 'ua/auth/login', {
        'vega_auth_login[_csrf]':token,
        'vega_auth_login[login]':prefs.login,
        'vega_auth_login[password]':prefs.password,
    }, addHeaders({
    	Referer: baseurl + 'ua/auth/login',
    	'X-CSRF-Token': token,
    	'X-Requested-With': 'XMLHttpRequest'
    }));

    var json = getJson(html);

    if(!json.success){
        var error = json.error;
        if(!error)
        	error = json.validation && Object.values(json.validation).join('\n');
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
    
    var result = {success: true};
	
    html = AnyBalance.requestGet(baseurl, g_headers);

    getParam(html, result, 'balance', /<span[^>]+balance[^\-][^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<div[^>]+client-name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'number', /Договор №([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /<span[^>]+account-status-text[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<span[^>]+desc[^>]*>\s*Тариф[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}
