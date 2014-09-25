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
	var baseurl = 'https://secure.mdr26.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '?action=accounts', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
	html = AnyBalance.requestPost(baseurl + '?action=accounts', {
        city:	prefs.city || 3,
        login:	prefs.login,
        pass:	prefs.password,
        log: ''
	}, addHeaders({Referer: baseurl + '?action=accounts'}));
	
	if (!/action=logout/i.test(html)) {
		var error = getParam(html, null, null, /color="red"(?:[^]){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + '?action=stats', g_headers);
    
	var result = {success: true};
	
    getParam(html, result, '__tariff', /Расчетный период(?:[\s\S]*?<td[^>]*>){7}([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'begin_period', /Долг на начало(?:[^>]*>){41}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accrued', /Начислено в(?:[^>]*>){37}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'odn', /ОДН в(?:[^>]*>){33}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'changes', /Изменения в(?:[^>]*>){29}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'paid', /Оплачено(?:[^>]*>){25}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Долг на конец(?:[^>]*>){21}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}