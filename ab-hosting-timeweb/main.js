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
    var baseurl = 'https://cp2.timeweb.ru/';
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
	
    getParam(html, result, 'balance', [/Текущий баланс[\s\S]*?<td>([\s\S]*?)<\/td>/i, /"user-balance"(?:[^>]*>){1}([^<]*)/i], replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, '__tariff', /customer_plan_value[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	var days = getParam(html, null, null, /Дней осталось:(?:[^>]*>){3}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	if(isset(days)) {
		getParam(new Date().getTime() + (days*86400*1000), result, 'deadline');
	}
    AnyBalance.setResult(result);
}