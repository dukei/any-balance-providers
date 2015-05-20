/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.infoshkola.net/';
    AnyBalance.setDefaultCharset('utf-8'); 
	AnyBalance.setOptions({forceCharset: 'windows-1251'});
	
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login', {
        login:prefs.login,
        pass:prefs.password,
        remember:1
    }, addHeaders({Referer: baseurl + 'login'})); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	AnyBalance.setOptions({forceCharset: 'utf-8'});
	
	html = AnyBalance.requestGet(baseurl + 'sdpupil_pg/index.php?page=personal', g_headers);
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Остаток на счете:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_type', /Тип счета:(?:[\s\S]*?<[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'dogovor', /Договор:(?:[\s\S]*?<[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Абонент:(?:[\s\S]*?<[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', />\s*Тариф:([\s\S]*?)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}