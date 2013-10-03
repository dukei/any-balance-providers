/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.dns-shop.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.document, 'Введите номер документа!');
	
	var html = requestPostMultipart(baseurl + 'service_status/?phone='+ encodeURIComponent(prefs.login)+'&document_number='+encodeURIComponent(prefs.document), {
		action:'',
		id:'',
		phone:prefs.login,
		is_posted:'1',
		document_number:prefs.document,
    }, addHeaders({Referer: baseurl }));
	
	if(!/Информация от/i.test(html)) {
		throw new AnyBalance.Error('Не удалось найти информацию. Сайт изменен?');
	}
	
	var table = getParam(html, null, null, /Информация от[^>]*>([\s\S]*?)<\/div>/i);
	var p = sumParam(table, null, null, /<p>([\s\S]*?)<\/p>/ig, replaceTagsAndSpaces, html_entity_decode);
	
	var result = {success: true, all:''};
	
	for(i = 0; i < p.length; i++) {
		result.all += p[i]+ '\n';
	}
	result.all = result.all.replace(/^\s+|\s+$/g, '');
    
	getParam(html, result, 'fio', /Имя(?:\s|&nbsp;)*абонента:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}