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
    var baseurl = 'http://www.taxi1505.com.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl + '?a=login', {
        login:prefs.login,
        password:prefs.password,
        submit:'Зайти !'
    }, addHeaders({Referer: baseurl})); 
	
    if(!/logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl+ 'cabinet/', g_headers);

    var result = {success: true};
    getParam(html, result, 'payed', /Платних поїздок після безкоштовної:(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'free', /Невикористаних безкоштовних поїздок:(\d+)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}