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
    var baseurl = 'https://www.yargsm.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestPost(baseurl + 'issa/login.php', {
        phone:prefs.login,
        password:prefs.password,
        action:'l'
    }, g_headers); 

    if(!/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'issa/balance.php', g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /Клиент:.*?<td>(.*?)<\//i, null, html_entity_decode);
	getParam(html, result, 'acc', /Номер счета:.*?<td>(.*?)<\//i, null, html_entity_decode);
	getParam(html, result, 'balance', /Баланс.*?<td>(.*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тарифный план:.*?<td>(.*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Телефонный номер:.*?<td>(.*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус:.*?<td>(.*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}