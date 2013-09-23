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
	var baseurl = 'http://www.xru.com/search/DefaultRu.aspx?ts=';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите номер накладной!');
		
	var html = AnyBalance.requestGet(baseurl + prefs.login, g_headers);
	
	if(/Заказа с таким номером не найдено/i.test(html)) {
		var error = getParam(html, null, null, /<td[^>]*color:#ff0000[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось получить данные. Сайт изменен?');
	}
    var result = {success: true, all:''};
	getParam(html, result, 'status', /<td[^>]*>Номер накладной<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<td[^>]*>Номер накладной<\/td>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	var table = getParam(html, null, null, /div[^>]*OrderTrack[\s\S]*?(<table[\s\S]*?<\/table>)/i);
	
	if(isAvailable('all')) {
		var rows = sumParam(table, null, null, /(<tr>(?!<tr>)[\s\S]*?<\/tr>)/ig, replaceTagsAndSpaces, html_entity_decode);
		for(i = 0 ; i < rows.length; i++) {
			result.all += rows[i] + '\n';
			
		}
	}	
	
    AnyBalance.setResult(result);
}