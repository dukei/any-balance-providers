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
    var baseurl = 'https://188.244.184.44/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'login', {
		'action.remote_login.1f71s9.x':'20',
		'action.remote_login.1f71s9.y':'5',
		'ej71s9':'0',
		'fj71s9':'true',
		'redirect':'',
		login_remote3xpht9:prefs.login,
        password_remote4xpht9:prefs.password,
    }, addHeaders({Referer:'https://188.244.184.44/'})); 

	if(!/Выход/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'fio', /Наименование клиента[\s\S]{1,150}valign="top">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Итого на[\s\S]*?<b>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'overpay', /Переплата([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}