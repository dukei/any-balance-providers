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
    var baseurl = 'http://www.ekomobile.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var	html = AnyBalance.requestPost(baseurl + 'personal/index.php?login=yes', {
		'AUTH_FORM':'Y',
		'Login':'Âîéòè',
		'TYPE':'AUTH',
		'backurl':'/personal/index.php',
        'USER_LOGIN':prefs.login,
        'USER_PASSWORD':prefs.password,
    }, g_headers); 
	
    if(!/logout=yes/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'status', /Статус:[\s\S]*?<span>([\s\S]*?)<\/span>/i, null, html_entity_decode);
	getParam(html, result, 'fio', /Ваше имя:[\s\S]*?">\s*([\s\S]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<span>\s*([\s\S]*?)\s*<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Ваш телефон:[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс счета:[\s\S]*?<span>\s*([\s\S]*?)\s*<\/span>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}