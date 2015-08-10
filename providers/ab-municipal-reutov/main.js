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
	var baseurl = 'https://reutov-scgh.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'LogOn', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'LogOn', {
		'UserName': prefs.login,
		'Password': prefs.password
	}, addHeaders({Referer: baseurl + 'LogOn'}));
	
	if (!/LogOff/i.test(html)) {
		var error = getParam(html, null, null, /validation-summary-errors(?:[^>]*>)([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var html = AnyBalance.requestGet(baseurl + 'FlatOwner/Receipt/ListUnpaidReceipts', g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Сумма(?:[^>]*>){17}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Лицевой счет(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'period', /Детализация(?:[^>]*>){11}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    
    if(isAvailable('water_details')) {
        html = AnyBalance.requestGet(baseurl + 'FlatOwner/Counter/List/Water', g_headers);
        
        var trs = sumParam(html, null, null, /<tr>\s*<td>(?:[^>]*>){60,80}\s*<\/td>\s*<\/tr>/ig);
        AnyBalance.trace('Found trs: '  + trs.length);
        var details = '';
        for(var i = 0; i < trs.length; i++) {
            var currentTr = trs[i];
            
            var name = getParam(currentTr, null, null, /<tr>\s*<td>([^<]+)/i, replaceTagsAndSpaces);
            var values = sumParam(currentTr, null, null, /<label title=['"]Расход \d+ м3['"]>\s*(\d+)\s*<\/label>/ig, replaceTagsAndSpaces, parseBalance);
            var value = values[values.length-1];
            
            details += name + ': ' + value + ' м3 ' + (i === trs.length-1 ? '' : '\n');
        }
        result.water_details = details;
    }
    
	AnyBalance.setResult(result);
}