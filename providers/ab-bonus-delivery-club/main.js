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
    var baseurl = 'http://www.delivery-club.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'ajax/login/', {
        c_l:prefs.login,
        c_p:prefs.password,
    }, addHeaders({Referer: baseurl + 'ajax/login/'})); 

    if(!/success/i.test(html)){
		var json = getJson(html);
        throw new AnyBalance.Error(json.error.log_in_failed);
    }

	html = AnyBalance.requestGet(baseurl + 'history/', g_headers);
	
    var result = {success: true};
    getParam(html, result, 'fio', /<div id="user-profile">\s*<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<a href="\/prizes\/" id="user-points">([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}