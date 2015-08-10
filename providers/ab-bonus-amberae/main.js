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
    var baseurl = 'http://myamber.ae/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestPost(baseurl, {
		'Submit.x':27,
		'Submit.y':6,
		'action':'login',
		'rurl':'http://87.249.30.82/var/www/myamber.ae/web/index.php',
        uname:prefs.login,
		upass:prefs.password,
    }, addHeaders({Referer: baseurl})); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can`t login. Site changed?');
    }
	
    var result = {success: true};
    getParam(html, result, 'fio', /Name:[\s\S]*?align="left">\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Membership Number:[\s\S]*?align="left">\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'num', /Membership Number:[\s\S]*?align="left">\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Points Balance:[\s\S]*?td\s*>\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tier', /Tier Name:[\s\S]*?<\s*td\s*>\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}