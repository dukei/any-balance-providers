/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://bill.evo.uz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	html = AnyBalance.requestPost(baseurl + 'cab/', {
        login:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: baseurl + 'cab/'}));

	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'cab/?module=accounts', addHeaders({Referer: baseurl + 'cab/'}));
	// Если счет не указан в настройках, найдем первый
	prefs['acc_num'] = prefs['acc_num'] ? prefs['acc_num'] : getParam(html, null, null, /ID лицевого счета(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i);
	var regExp = new RegExp('(<table[^>]*utm-table(?:[^>]*>){16,20}'+ prefs['acc_num'] +'[\\s\\S]*?</table>)', 'i');
	var table = getParam(html, null, null, regExp);
	if(!table)
		throw new AnyBalance.Error('Не удалось найти таблицу со счетами. Сайт изменен?');
	
	var result = {success: true};
	getParam(table, result, 'balance', /Баланс(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'account', /ID лицевого счета(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	html = AnyBalance.requestGet(baseurl + 'cab/?module=40_tariffs', addHeaders({Referer: baseurl + 'cab/'}));
	regExp = new RegExp('(<table[^>]*utm-table(?:[^>]*>){2,4}Лицевой счет '+ prefs['acc_num'] +'[\\s\\S]*?</table>)', 'i');
	table = getParam(html, null, null, regExp);
	// Если мы не нашли таблицу с тарифами, значит не найдем название тарифа, а без него мы не получит трафик
	if(table) {
		getParam(table, result, '__tariff', /Текущий ТП(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		
		if(isAvailable(['upload_day', 'download_day', 'upload_night', 'download_night', 'internal'] )) {
			html = AnyBalance.requestGet(baseurl + 'cab/?module=41_services', addHeaders({Referer: baseurl + 'cab/'}));
			var escapeTarif = getParam(result.__tariff, null, null, null, [/\[/i, '\\[', /\]/i, '\\]', /\$/i, '\\$', ]);
			regExp = new RegExp('<a href=\"([^\"]*)\">Передача трафика(?:[^>]*>){1,5}'+ escapeTarif +'</td>', 'i');
			var href = getParam(html, null, null, regExp);
			
			html = AnyBalance.requestGet(baseurl + 'cab/' + href, addHeaders({Referer: baseurl + 'cab/'}));
			// Полуаем трафик
			getParam(html, result, 'upload_day', /Upload(?:\.|\s*) \(day\)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'download_day', /Download(?:\.|\s*) \(day\)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'upload_night', /Upload(?:\.|\s*) \(night\)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'download_night', /Download(?:\.|\s*) \(night\)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'internal', /Internal\s*\(free of charge\)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		}
	}
	else
		AnyBalance.trace('Не удалось найти таблицу с тарифами. Сайт изменен?');
	
    AnyBalance.setResult(result);
}