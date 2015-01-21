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
	var baseurl = 'http://market.yandex.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.good, 'Введите наименование товара!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');    
    
    var res = prefs.good.replace(/(^\s+|\s+$)/g, '');
    res = res.replace(/ /g,"+");
    AnyBalance.trace(res);
     
    html = AnyBalance.requestGet(baseurl + '/search.xml?cvredirect=2&text=' + res, g_headers);    
	
	if (/Сортировать/i.test(html)) {
		AnyBalance.trace('Необходимо перейти на страницу товара вручную...');
        var model_href = getParam(html, null, null, /b-offers__title(?:[^>]*>)[\s\S]*?href="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		checkEmpty(model_href, 'Не удалось найти информацию по товару ' + prefs.good + '! Сайт изменен?' , true);
        html = AnyBalance.requestGet(baseurl + model_href, g_headers);
	}
	
	if (!/Средняя цена/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('По вашему запросу ничего не найдено.');        
    }
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Средняя цена(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'min_price', 'max_price'], /Средняя цена(?:[^>]*>){5}([\s\S]*?)<meta/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'min_price', /b-prices__range(?:[^>]*>)([\d\s]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'max_price', /b-prices__range(?:[^>]*>[\d\s]+)…([\s\d]+)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'rating_value', /meta\scontent="([\d\.\,\s]*?)"\sitemprop="ratingValue"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /product-title(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}