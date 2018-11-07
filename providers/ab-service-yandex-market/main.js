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

function levenshtein( str1, str2 ) {	
	// Calculate Levenshtein distance between two strings
	// 
	// +   original by: Carlos R. L. Rodrigues
	var s, l = (s = str1.split("")).length, t = (str2 = str2.split("")).length, i, j, m, n;
	if(!(l || t)) return Math.max(l, t);
	for(var a = [], i = l + 1; i; a[--i] = [i]);
	for(i = t + 1; a[0][--i] = i;);
	for(i = -1, m = s.length; ++i < m;){
		for(j = -1, n = str2.length; ++j < n;){
			a[(i *= 1) + 1][(j *= 1) + 1] = Math.min(a[i][j + 1] + 1, a[i + 1][j] + 1, a[i][j] + (s[i] != str2[j]));
		}
	}
	return a[l][t];
}


function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://market.yandex.ru';
    AnyBalance.setDefaultCharset('utf-8');
	
    AB.checkEmpty(prefs.good, 'Введите наименование товара!');
     
    var html = AnyBalance.requestGet(baseurl + '/search?cvredirect=2&text=' + encodeURIComponent(prefs.good), g_headers);  
    
    if(!html || AnyBalance.getLastStatusCode() >= 400) {
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var redir = getParam(html, /window\.location\.replace\("([^"]*)/i, [/ /g, '+']);
    if(redir){
        AnyBalance.trace('Перенаправлены на ' + redir);
        html = AnyBalance.requestGet(joinUrl(baseurl, redir), g_headers);
    }
	
    if (/Сортировать/i.test(html)) {
        AnyBalance.trace('Необходимо перейти на страницу товара вручную...');
        var models = getElements(html, /<div[^>]+n-snippet-card2\b/ig);
        AnyBalance.trace('Найдено товаров ' + models.length);
        AB.checkEmpty(models.length > 0, 'Не удалось найти информацию по товару ' + prefs.good + '! Сайт изменен?' , true);

        var modelBest, modelTitle, levMin = 100000;
        for(var i=0; i<models.length; ++i){
        	var model = models[i];
        	var title = getElement(model, /<div[^>]+n-snippet-card2__title/i);
        	var sig = getElements(title, /<strong/ig, replaceTagsAndSpaces).join('');
        	var lev = levenshtein(prefs.good, sig);
        	AnyBalance.trace('Товар ' + replaceAll(title, replaceTagsAndSpaces) + '\nSig: ' + sig + ', distance: ' + lev);

           	if(lev < levMin){
           		modelBest = model;
           		modelTitle = title;
           		levMin = lev;
           	}
        }

        AnyBalance.trace('Выбран товар ' + getElement(modelBest, /<div[^>]+n-snippet-card2__title/i, replaceTagsAndSpaces));
        
        var model_href = AB.getParam(modelTitle, /<a\b[^>]+?href="([^"]+)"/i, AB.replaceTagsAndSpaces);
        AB.checkEmpty(model_href, 'Не удалось найти ссылку на товар ' + prefs.good + '! Сайт изменен?' , true);
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

    result.__tariff = getElement(html, /<h1/i, replaceTagsAndSpaces);
    getMetaValue('min_price', 'lowPrice');
    getMetaValue('max_price', 'highPrice');
    getMetaValue('offers', 'offerCount');
    getMetaValue('reviews', 'reviewCount');
    getMetaValue('rating_value', 'ratingValue');

    AnyBalance.setResult(result);
}