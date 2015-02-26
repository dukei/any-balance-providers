/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function getIfAvailable(counters, url){
    var html;
    if(isAvailable(counters)){
        html = AnyBalance.requestGet(url, g_headers);
        if(!html || AnyBalance.getLastStatusCode() > 400)
            throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
        return html;
    }
    return html;
}

function getCRFromTable(result, sellCounter, purchaseCounter, url){
    var table, html;
    if(html = getIfAvailable([sellCounter, purchaseCounter], url)){
        table = getParam(html, null, null, /(Покупают по[\s\S]*?)<\/table>/i);
        getParam(table, result, sellCounter, /class="price"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);

        table = getParam(html, null, null, /(Продают по[\s\S]*?)<\/table>/i);
        getParam(table, result, purchaseCounter, /class="price"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    }
}

function getCRFromHeader(result, sellCounter, purchaseCounter, url){
    var html;
    if(html = getIfAvailable([sellCounter, purchaseCounter], url)){
        getParam(html, result, sellCounter, /Средняя покупка:<\/small>\s*<span>([\S\s]+?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, purchaseCounter, /Средняя продажа:<\/small>\s*<span>([\S\s]+?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    }
}

function main() {
	var prefs = AnyBalance.getPreferences(),
        baseurl = 'http://minfin.com.ua/',
        course = prefs.course || '1',
        result = {success: true},
        entity,
        table,
        html;

	AnyBalance.setDefaultCharset('utf-8');
	
    if (course == '1') {
        // Курсы от банков
        getCRFromTable(result, 'sell_usd', 'purchase_usd', baseurl + 'currency/banks/usd/');
        getCRFromTable(result, 'sell_eur', 'purchase_eur', baseurl + 'currency/banks/eur/');
        getCRFromTable(result, 'sell_rub', 'purchase_rub', baseurl + 'currency/banks/rub/');
    } else if (course == '2') {
        // Карточные курсы
        getCRFromTable(result, 'sell_usd', 'purchase_usd', baseurl + 'currency/cards/usd/');
        getCRFromTable(result, 'sell_eur', 'purchase_eur', baseurl + 'currency/cards/eur/');
        getCRFromTable(result, 'sell_rub', 'purchase_rub', baseurl + 'currency/cards/rub/');
    } else if (course == '3')  {
        // Индикативные курсы НБУ
        if(html = getIfAvailable(['course_USD', 'course_EUR', 'course_RUB'], baseurl + 'currency/nbu/')){
            table = getParam(html, null, null, /(Курсы валют НБУ[\s\S]*?)<\/table>/i);

            entity = /доллары США<\/a><\/td>\s*<td>(\d+)<\/td>\s*?<td[^>]*>([\s\d.]*?)<\/td>/i.exec(table);
            getParam(entity[2]/entity[1], result, 'course_USD');

            entity = /ЕВРО<\/a><\/td>\s*<td>(\d+)<\/td>\s*?<td[^>]*>([\s\d.]*?)<\/td>/i.exec(table);
            getParam(entity[2]/entity[1], result, 'course_EUR'); 

            entity = /российские рубли<\/a><\/td>\s*<td>(\d+)<\/td>\s*?<td[^>]*>([\s\d.]*?)<\/td>/i.exec(table);
            getParam(entity[2]/entity[1], result, 'course_RUB');
        } 
    } else {
        // Валютный аукцион
        getCRFromHeader(result, 'sell_usd', 'purchase_usd', baseurl + 'currency/auction/usd/buy/all/');
        getCRFromHeader(result, 'sell_eur', 'purchase_eur', baseurl + 'currency/auction/eur/buy/all/');
        getCRFromHeader(result, 'sell_rub', 'purchase_rub', baseurl + 'currency/auction/rub/buy/all/');
    }
    
	AnyBalance.setResult(result);
}