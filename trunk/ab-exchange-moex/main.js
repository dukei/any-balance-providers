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
	var baseurl = 'http://pda.micex.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var result = {success: true};
	
	getParam(html, result, 'mmvb', />Индекс ММВБ(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'USDEUR_BKT', />USDEUR_BKT(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'USDRUB_TOM', />USDRUB_TOM(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'EURRUB_TOM', />EURRUB_TOM(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'EURUSD_TOM', />EURUSD_TOM(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'USD', />USD ЦБ(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'EUR', />EUR ЦБ(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}