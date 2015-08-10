/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    // var baseurl = 'https://cabinet.211.ru/';
    var baseurl = 'http://passport.211.ru/';

    var html = AnyBalance.requestGet(baseurl + 'user/index', g_headers);
	
	try {
		html = AnyBalance.requestPost('http://header.211.ru/', {
			retpath: baseurl,
			login:prefs.login,
			password:prefs.password
		}, addHeaders({Referer: baseurl + '/user/index'}));
	} catch(e) {
		if(prefs.dbg)
			html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);
		else
			throw e;
	}
	
    if(!/(\/logout)/i.test(html)){
        var error = sumParam(html, null, null, /<font[^>]*class="error"[^>]*>([\s\S]*?)<\/font>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error, null, /Введенная информация неверна/i.test(error));
        error = sumParam(html, null, null, /<span[^>]*class="input-message"[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error);
			
		AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось войти в паспорт! Изменения на сайте?");
    }
	
    var result = {success: true};

	getParam(html, result, 'balance', /<a[^>]*class="header-balance-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Ваш тариф:([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'bonus', /<a[^>]*class="header-bonus-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
