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
	var baseurl = 'http://valuta.today/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту! Попробуйте обновить данные позже.');
	
    var quote = prefs.quote || 'USD';
	
    html = AnyBalance.requestGet(baseurl + 'ukraine/' + quote + '/mastercard.html', g_headers);
	
	var result = {success: true};

	getParam(html, result, 'rate_date', /на\s*(\d{2}\.\d{2}\.\d{2,4})/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'buy', /Покупка(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'buy_rate_change', /Покупка(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sell', /Продажа(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sell_rate_change', /Продажа(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<title>\s*Курсы валют\s*-([^]+)<\/title>/i, replaceTagsAndSpaces, html_entity_decode);
    
	AnyBalance.setResult(result);
}