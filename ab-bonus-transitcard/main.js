/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    var baseurl = 'https://client.transitcard.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	// Надо найти x
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    var x = getParam(html, null, null, /<form\s*id="[\s\S]*?"\s*method="post"\s*action="([\s\S]*?)">/i, null, html_entity_decode);
    if(!x)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	html = AnyBalance.requestPost(baseurl + x, {
        username:prefs.login,
        password:prefs.password,
        signIn:'x'
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/exit_b/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
	getParam(html, result, 'balance', /Ваш баланс:[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}