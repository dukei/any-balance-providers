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
    var baseurl = 'http://www.5zvezd.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'ajax/login/', {
        login:prefs.login,
        pass:prefs.password,
        AJAX:'true',
		ACTION:'login',
    }, addHeaders({Referer: baseurl + 'login'})); 
	
	html = AnyBalance.requestGet(baseurl + 'profile/edit/', g_headers);
	
    if(!/logout=yes/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс карты[\s\S]*?>([\s\S]*?)филь/i, null, parseBalance);
	getParam(html, result, 'tickets', /Баланс карты[\s\S]*?span>([\s\S]*?)биле/i, null, parseBalance);
	getParam(html, result, '__tariff', /"balance_card">[\s\S]*?">\s*([\s\S]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /<h2>\s*([\s\S]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'next', /(До карты[\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}