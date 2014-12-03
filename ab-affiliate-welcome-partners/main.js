/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://welcomepartners.com/';
	AnyBalance.setDefaultCharset('utf-8');
    
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
	var html = AnyBalance.requestGet(baseurl + 'webmaster/webmasters/login', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) 
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
	html = AnyBalance.requestPost(baseurl + 'webmaster/webmasters/login', {
		'_method': 'POST',
		'data[Webmaster][email]': prefs.login,
		'data[Webmaster][pass]': prefs.password
	}, addHeaders({Referer: baseurl + 'webmaster/webmasters/login'}));
    
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /flashMessage(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    var dt = new Date();
    var ms = dt.getTime() - ((86400*1000) * (dt.getDay()-1));
    dt = new Date(ms);
    var date = new Date();
    
    var dateFrom = dt.getFullYear() + "-" + (dt.getMonth()+1) + "-" + dt.getDate();
    var dateTo = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate();
	
    var html = AnyBalance.requestPost(baseurl + 'webmaster/WebmasterReport/ajaxGetReport/site', {
        'filters[dateFrom]': dateFrom,
        'filters[dateTo]': dateTo
    }, g_headers);
    
	json = getJson(html);	
	
    if(json.error.message != null) {
		throw new AnyBalance.Error(json.error.message);
	}
    
	var result = {success: true};
    
	var row = json.rows[0].data;
	
	getParam(row[0] + '', result, 'site_name', null, replaceTagsAndSpaces);
	getParam(row[12] + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(row[3] + '', result, 'site_views', null, replaceTagsAndSpaces, parseBalance);
	getParam(row[4] + '', result, 'site_clicks', null, replaceTagsAndSpaces, parseBalance);
	getParam(row[7] + '', result, 'deposite_amount', null, replaceTagsAndSpaces, parseBalance);
	getParam(row[8] + '', result, 'deposite_sum', null, replaceTagsAndSpaces, parseBalance);
	getParam(row[9] + '', result, 'players_balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(dateFrom + ' - ' + dateTo, result, 'period', null, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}