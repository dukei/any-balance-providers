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
    var baseurl = 'http://userator.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + '/cgi-bin/login.cgi', g_headers);

	html = AnyBalance.requestPost(baseurl + '/cgi-bin/login.cgi', {
        Login:prefs.login,
        Password:prefs.password,
    }, addHeaders({Referer: baseurl + '/cgi-bin/login.cgi'})); 

    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<p\s*style="color:red;">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /Баланс:[^>]*>[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}