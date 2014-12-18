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
    var baseurl = "https://bonus.letai.ru:8443/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'template.LOGIN/', g_headers);

    var VGN_NONCE = getParam(html, null, null, /VGN_NONCE"\s*value="([\s\S]*?)"/i, null, html_entity_decode);
    if(!VGN_NONCE)
        throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');

    html = AnyBalance.requestPost(baseurl + 'template.LOGIN/action.process/', {
        'entrance':'login', 
        'VGN_NONCE':VGN_NONCE, 
        login:prefs.login,
        password:prefs.password,
        Submit223:'Войти'
    }, g_headers); 

    if(!/LOGOUT/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'portal/site/letaibonus/profile/', g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /ФИО:\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'acc', /Номер участия в программе Летай Бонус:\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<strong>([\s\S]{1,20})бонусных баллов<\/strong>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}