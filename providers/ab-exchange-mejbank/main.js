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
        table,
        html;

	AnyBalance.setDefaultCharset('utf-8');
	
    if (course == '1') {
        // Курсы от банков
        html = AnyBalance.requestGet(baseurl + 'currency/banks/', g_headers);

        getParam(html, result, 'sell_usd', /<a href="\/currency\/banks\/usd\/">ДОЛЛАР<\/a>[^]*?<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'purchase_usd', /<a href="\/currency\/banks\/usd\/">ДОЛЛАР<\/a>[^]*?<td[^>]*>[^]*?([\d.\s]+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'sell_eur', /<a href="\/currency\/banks\/eur\/">ЕВРО<\/a>[^]*?<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'purchase_eur', /<a href="\/currency\/banks\/eur\/">ЕВРО<\/a>[^]*?<td[^>]*>[^]*?([\d.\s]+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'sell_rub', /<a href="\/currency\/banks\/rub\/">РУБЛЬ<\/a>[^]*?<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'purchase_rub', /<a href="\/currency\/banks\/rub\/">РУБЛЬ<\/a>[^]*?<td[^>]*>[^]*?([\d.\s]+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    } else if (course == '2') {
        // Карточные курсы
        getCRFromTable(result, 'sell_usd', 'purchase_usd', baseurl + 'currency/cards/usd/buy/all/');
        getCRFromTable(result, 'sell_eur', 'purchase_eur', baseurl + 'currency/cards/eur/buy/all/');
        getCRFromTable(result, 'sell_rub', 'purchase_rub', baseurl + 'currency/cards/rub/buy/all/'); 
    } else if (course == '3') {
        // Индикативные курсы НБУ
        if(html = getIfAvailable(['course_USD', 'course_EUR', 'course_RUB'], baseurl + 'currency/nbu/')){
            table = getParam(html, null, null, /(Официальный курс валют[\s\S]*?)<\/table>/i);
            if(!table)
                throw new AnyBalance.Error('Не удалось найти таблицу с курсами! Сайт изменился?');

            getParam(html, result, 'course_USD', /<a href="\/currency\/nbu\/usd\/">ДОЛЛАР<\/a>[^]*?<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'course_EUR', /<a href="\/currency\/nbu\/eur\/">ЕВРО<\/a>[^]*?<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'course_RUB', /<a href="\/currency\/nbu\/rub\/">РУБЛЬ<\/a>[^]*?<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        }
    } else {
        // Валютный аукцион
        getCRFromHeader(result, 'sell_usd', 'purchase_usd', baseurl + 'currency/auction/usd/buy/all/');
        getCRFromHeader(result, 'sell_eur', 'purchase_eur', baseurl + 'currency/auction/eur/buy/all/');
        getCRFromHeader(result, 'sell_rub', 'purchase_rub', baseurl + 'currency/auction/rub/buy/all/');
    }
    
	AnyBalance.setResult(result);
}