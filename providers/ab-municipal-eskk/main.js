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
    var baseurl = 'http://www.eskk.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'log_individuals/index.php', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'log_individuals/index.php?login=yes', {
		backurl:'/log_individuals/index.php',
		AUTH_FORM:'Y',
		TYPE:'AUTH',
		DESCRIPTOR:1,
		USER_LOGIN:prefs.login,
		USER_PASSWORD:prefs.password,
		Login:'Войти',
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/payment_history/i.test(html)){
        var error = getParam(html, null, null, /class="errortext"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /ФИО:(?:[\S\s]*?<td[^>]*>)([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Лицевой счет:(?:[\S\s]*?<td[^>]*>)([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'category', /Категория потребления:(?:[\S\s]*?<td[^>]*>)([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable(['balance', 'oplata', 'counter_last_val'])){
		html = AnyBalance.requestGet(baseurl + 'individual/receipt.php', g_headers);
		getParam(html, result, 'balance', /Долг на(?:[\S\s]*?<td[^>]*>)([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'oplata', /текущем месяце(?:[\S\s]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'counter_last_val', /последнее\s*<br>\s*показание(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
    AnyBalance.setResult(result);
}