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
	var baseurl = 'https://stat.fortex.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
        
	html = AnyBalance.requestPost(baseurl + 'login_user.htms', {
		'LOGIN': prefs.login,
		'PASSWD': prefs.password,
        'URL':'stat.fortex.ru',
        'domain':'',
        'subm':'Вход'
	}, addHeaders({Referer: baseurl + 'index.htms?AUTH_ERR=INIT'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /message(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /failed/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'main.htms', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    
    var href = new RegExp('(?:href\\s*=\\s*")(mstat[^"]+)', 'i');
    var final_href = getParam(html, null, null, href, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.trace(final_href);
    
    html = AnyBalance.requestGet(baseurl + final_href, g_headers);
    
    var select = getParam(html, null, null, /Тарифный план(?:\s|&nbsp;)*<select[^>]*>([\s\S]*?)<\/select>/i);
    if(select) {
      sumParam(select, result, '__tariff', /<option[^>]*>([^<]{5,})<\/option>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    }
    
    var trs = sumParam(html, null, null, new RegExp('<tr>\\s*<td[^>]*>\\s*<a[^>]*title="[\\da-z]*' + (prefs.digits || '') + '(?:[^>]*>){13}\\s*</tr>', 'ig'));     
    AnyBalance.trace('trs: ' + trs.length);
     
    getParam(trs[0], result, 'account_id', /title="([0-9"]+)/i, replaceTagsAndSpaces);
     
    for(var i = 0; i < trs.length; i++) {
       var tr = trs[i];
       var name = getParam(tr, null, null, /<a[^>]*title="([^"]+)/i, replaceTagsAndSpaces);
       if(/Абонентская плата/i.test(name)) {
          sumParam(tr, result, 'abon', /(?:[^>]*>){14}([\d\s.,]+)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
       } else if(/Входящий трафик/i.test(name)) {
          sumParam(tr, result, 'data_income', /(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
       }
    }
	
	AnyBalance.setResult(result);
}