/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = 'https://cabinet.211.ru/';

    var html = AnyBalance.requestGet(baseurl + 'auth/index', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'auth/index', {
		retpath: baseurl,
		login:prefs.login,
		password:prefs.password
	}, addHeaders({Referer: baseurl + '/user/index'}));
	
    if(!/(\/logout)/i.test(html)){
        var error = sumParam(html, null, null, /<span[^>]*class="input-message"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в паспорт! Изменения на сайте?");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Итого на[\s\d.]{8,}(?:[^>]*>){4}([-\s\d.,]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Ваш тариф:([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'bonus', /<a[^>]*class="header-bonus-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
