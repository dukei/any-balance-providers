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
	var baseurl = 'https://pcb24.ru/v1/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cgi/bsi.dll', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'cgi/bsi.dll', {
		LG: prefs.login,
		PW: prefs.password,
		'T': 'RT_w3c_10Loader.RProcess',
		'R':'LOGIN',
	}, addHeaders({Referer: baseurl + 'cgi/bsi.dll?T=RT_w3c_10Loader.RProcess&R=INDEX'}));
	
	if (!/Вы авторизованы/i.test(html)) {
		var error = getParam(html, null, null, /warning.gif([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Вы ошиблись при вводе логина или пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Клиент:([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
	
	var nextHref = getParam(html, null, null, /window\.location\.href\s*=\s*['"]\.\.\/([^"']+)/i);
	if(!nextHref)
		throw new AnyBalance.Error('Не удалось найти ссылку на переадресацию. Сайт изменен?');
	
	html = AnyBalance.requestGet(baseurl + nextHref, g_headers);
	
	// Все, теперь есть карта
	//<TR onClick=(?:[^>]*>){5}\d+5115(?:[^>]*>){19}\s+<\/TR>
	var cardNum = prefs.cardnum || '';
	var tr = getParam(html, null, null, new RegExp('<TR\\s+onClick=(?:[^>]*>){5}\\d+' + cardNum + '(?:[^>]*>){19}\\s*</TR>', 'i'));
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));
	
	getParam(tr, result, '__tariff', /([^>]*>){6}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(result.__tariff, result, 'cardnumber');
	getParam(tr, result, 'balance', /([^>]*>){20}/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'available', /([^>]*>){22}/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'limit', /([^>]*>){24}/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'available', 'limit'], /([^>]*>){8}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'avail_till', /([^>]*>){10}/i, replaceTagsAndSpaces, parseDate);
	getParam(tr, result, 'status', /([^>]*>){12}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}