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
    var baseurl = 'https://stat.svzt.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login', {
        'b_auth[login]':prefs.login,
        'b_auth[password]':prefs.password,
        'b_auth[submit]':'Войти в кабинет'
    }, addHeaders({Referer: baseurl + 'login'})); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /Обнаружены ошибки:<\/p><ul><li>(.*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'account', g_headers);
	
    var result = {success: true};
	getParam(html, result, 'acc_num', /лицевой счёт[^<]*<[^>]*>(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /на вашем счёте[^<]*<[^>]*>[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус(?:[^<]*<[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тариф:(.*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
    if(isAvailable('traf_income','traf_outgoing')){
		html = AnyBalance.requestGet(baseurl + 'traffic', g_headers);
		
		var table = getParam(html, null, null, /(<table[^>]*inline[\s\S]*?<\/table>)/i);
		if(table){
			// Получаем все ряды из таблицы
			var Rows = sumParam(table, null, null, /(<td[^>]*center[\s\S]*?<\/tr>)/ig, null, html_entity_decode, null);
			if(Rows && Rows.length > 0){
				getParam(Rows[Rows.length-1], result, 'traf_income', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficKb);
				getParam(Rows[Rows.length-1], result, 'traf_outgoing', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficKb);
			}
		}
		else
			AnyBalance.trace('Не удалось найти таблицу с трафиком, сайт изменился?');
	}
    AnyBalance.setResult(result);
}

function parseTrafficKb(text){
    return parseTrafficEx(text, 1024, 2, 'kb');
}