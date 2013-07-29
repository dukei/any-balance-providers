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
    var baseurl = 'https://cp.timeweb.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestPost(baseurl, {
		'_action':'login',
		'_host':'imap.timeweb.ru',
		'_show_form':'login_hosting',
        username:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: baseurl})); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /class="error-alert-message">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, '__tariff', /customer_plan_value[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Дата блокирования[\s\S]*?block_date_value">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	
	html = AnyBalance.requestGet(baseurl + 'info/');
	getParam(html, result, 'fio', /ФИО[\s\S]{1,10}'([\s\S]*?)'/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}