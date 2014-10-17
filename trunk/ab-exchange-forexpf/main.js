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

function getCurrent(html, result, value) {
	getParam(html, result, value + '_bid', new RegExp('\\(' + value + '\\)([^>]*>){4}', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, value + '_ask', new RegExp('\\(' + value + '\\)([^>]*>){6}', 'i'), replaceTagsAndSpaces, parseBalance);
}

function main() {
	var baseurl = 'http://www.forexpf.ru/chart/usdrub/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var result = {success: true};
	
	getCurrent(html, result, 'USDRUB');
	getCurrent(html, result, 'EURRUB');
	
	AnyBalance.setResult(result);
}