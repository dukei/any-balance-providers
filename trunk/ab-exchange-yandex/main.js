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
	var baseurl = 'http://news.yandex.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'quotes/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var quote = prefs.quote || 'usd';
    
    if (quote == 'usd') {
        getInfo(baseurl, '1.html', quote);
    } else if (quote == 'brent'){
        getInfo(baseurl, '1006.html', quote);
    }
}

function getInfo(baseurl, href, quote) {

    html = AnyBalance.requestGet(baseurl + 'quotes/' + href, g_headers);
	var result = {success: true};
	
	getParam(html, result, 'date', /Дата(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, quote + '_rate', /Курс<(?:[^>]*>){10}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, quote + '_change', /Изменение(?:[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}












