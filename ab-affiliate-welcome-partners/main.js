/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://welcomepartners.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'webmaster/webmasters/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'webmaster/webmasters/login', {
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

    var date = new Date();
    var year = date.getFullYear(), 
        month = (date.getMonth() + 1), 
        day = date.getDate(),
        dateFromMonth = month - 1;

    var dateFrom = year + "-" + dateFromMonth + "-" + day;
    var dateTo = year + "-" + month + "-" + day;
	
    var html = AnyBalance.requestPost(baseurl + 'webmaster/WebmasterReport/ajaxGetReport/site', {
        'filters[dateFrom]': dateFrom,
        'filters[dateTo]': dateTo
    }, g_headers);
 
	json = getJson(html);	
	if(json.error.message != null) {
		throw new AnyBalance.Error(json.error.message);
	}
    
	var result = {success: true};
    
    result.site_name = json.data[0][0];
    result.site_views = json.data[0][3];
    result.site_clicks = json.data[0][4];
    result.deposite_amount = json.data[0][7];
    result.deposite_sum = json.data[0][8];
    result.players_balance = json.data[0][9];
    result.balance = json.data[0][12];
	
	AnyBalance.setResult(result);
}