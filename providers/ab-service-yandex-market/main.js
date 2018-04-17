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
    var baseurl = 'https://market.yandex.ru';
    AnyBalance.setDefaultCharset('utf-8');
	
    AB.checkEmpty(prefs.good, 'Введите наименование товара!');
     
    var html = AnyBalance.requestGet(baseurl + '/search.xml?cvredirect=1&text=' + encodeURIComponent(prefs.good), g_headers);  
    
    if(!html || AnyBalance.getLastStatusCode() >= 400) {
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
    if (/Сортировать/i.test(html)) {
        AnyBalance.trace('Необходимо перейти на страницу товара вручную...');
        var model_href = AB.getParam(html, null, null, /<a\s(?=[^>]*?snippet-card__header-link)[^>]*?href="([^"]+)"/i, AB.replaceTagsAndSpaces);
        AB.checkEmpty(model_href, 'Не удалось найти информацию по товару ' + prefs.good + '! Сайт изменен?' , true);
        html = AnyBalance.requestGet(baseurl + model_href, g_headers);
    }

    if (!/Средняя\s+цена/i.test(html)){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('По вашему запросу ничего не найдено.');        
    }
	
    var result = {success: true};

    AB.getParam(html, result, 'balance', /Средняя\s+цена[^>]*>[\s\S]{1,100}?product-card__price-value([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    function getMetaValue(name, itemprop) {
        AB.getParam(html, result, name, RegExp('<meta\\s(?=[^>]*itemprop="' + itemprop + '")[^>]*content="([^"]+)', 'i'), AB.replaceTagsAndSpaces, AB.parseBalance);
    }

    getMetaValue('min_price', 'lowPrice');
    getMetaValue('max_price', 'highPrice');
    getMetaValue('offers', 'offerCount');
    getMetaValue('reviews', 'reviewCount');
    getMetaValue('rating_value', 'ratingValue');

    AnyBalance.setResult(result);
}