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

function cmJSFCreateUserId() {
    var f = new Date();
    var d = Math.random();
    if (d == 0) {
        d = Math.random()
    }
    var b = Math.random();
    if (b == 0) {
        b = Math.random()
    }
    var c = d.toString().substring(2, 4) + b.toString().substring(2, 12) + f.getTime().toString();
    var a = c.length;
    var e = 23;
    if (a < e) {
        c = c + c.substring(a - (e - a), a)
    }
    if (a > e) {
        c = c.substring(0, e)
    }
    return c
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.amway.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet('http://www.amway.ru/login', g_headers);
	
    var tm = new Date().getTime();
	
    var scriptId = getParam(html, null, null, /cmSetClientID\('([^']*)/);
    if(!scriptId)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		
	AnyBalance.setCookie('www.amway.ru', 'cmTPSet', 'Y');
	AnyBalance.setCookie('www.amway.ru', 'CoreID6', cmJSFCreateUserId() + '&ci=' + scriptId);
	AnyBalance.setCookie('www.amway.ru', scriptId + '_clogin', 'l=' + ('' + tm).substring(0, 10) + '&v=1&e=' + tm);
	
    html = AnyBalance.requestPost(baseurl + '?action=auth.login', {
        login:prefs.login,
        password:prefs.password,
		country_code:'ru',
    }, addHeaders({Referer: baseurl})); 
	
    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*error_msg[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'my-points?flow.flow=my_points', g_headers);
	// Это не ошибка, реально надо два раза переходить сюда, иначе не показывает.
	html = AnyBalance.requestGet(baseurl + 'my-points?flow.flow=my_points', g_headers);
	
	var table = getParam(html, null, null, /(<table[^>]*class="table_data"[\s\S]*?<\/table>)/i);
	if(!table)
		AnyBalance.trace('Не нашли таблицу с данными, сайт изменен?');
	
	var result = {success: true};
	getParam(table, result, 'personal_points', /Личные баллы(?:[\s\S]*?<td[^>]*cell_1 is_last[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'group_points', /Групповые\/Лидерские Баллы(?:[\s\S]*?<td[^>]*cell_1 is_last[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'personal_sales', /Личная ВО(?:[\s\S]*?<td[^>]*cell_1 is_last[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'leader_sales', /Лидерская Величина Оборота(?:[\s\S]*?<td[^>]*cell_1 is_last[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);	
	getParam(table, result, '__tariff', /Месяц и год(?:[\s\S]*?<td[^>]*cell_1 is_last[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}