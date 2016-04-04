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

    if (AB.isAvailable(counters)) {
        html = AnyBalance.requestGet(url, g_headers);
        if (!html || AnyBalance.getLastStatusCode() > 400) {
            throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
        }
    }
    return html;
}

function getCRFromHeader(result, sellCounter, purchaseCounter, url){
    var html;
    if (html = getIfAvailable([sellCounter, purchaseCounter], url)) {
        AB.getParam(html, result, sellCounter, /Средняя покупка([^>]*>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, purchaseCounter, /Средняя продажа([^>]*>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
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

        AB.getParam(html, result, 'sell_usd', /<a href="\/currency\/banks\/usd\/">ДОЛЛАР<\/a>[^]*?<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'purchase_usd', /<a href="\/currency\/banks\/usd\/">ДОЛЛАР<\/a>[^]*?<td[^>]*>[^]*?([\d.\s]+)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'sell_eur', /<a href="\/currency\/banks\/eur\/">ЕВРО<\/a>[^]*?<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'purchase_eur', /<a href="\/currency\/banks\/eur\/">ЕВРО<\/a>[^]*?<td[^>]*>[^]*?([\d.\s]+)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'sell_rub', /<a href="\/currency\/banks\/rub\/">РУБЛЬ<\/a>[^]*?<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'purchase_rub', /<a href="\/currency\/banks\/rub\/">РУБЛЬ<\/a>[^]*?<td[^>]*>[^]*?([\d.\s]+)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    } else if (course == '2') {
        // Карточные курсы
        html = AnyBalance.requestGet(baseurl + 'currency/cards/', g_headers);

        AB.getParam(html, result, 'purchase_usd', /\/cards\/usd[^>]*>Доллар([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'sell_usd', /\/cards\/usd[^>]*>Доллар([^>]+>){10}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

        AB.getParam(html, result, 'purchase_eur', /\/cards\/eur[^>]*>([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'sell_eur', /\/cards\/eur[^>]*>([^>]+>){10}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

        AB.getParam(html, result, 'purchase_rub', /\/cards\/rub[^>]*>([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'sell_rub', /\/cards\/rub[^>]*>([^>]+>){10}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    } else if (course == '3') {
        // Индикативные курсы НБУ
        if (html = getIfAvailable(['course_USD', 'course_EUR', 'course_RUB'], baseurl + 'currency/nbu/')) {
            table = AB.getParam(html, null, null, /(Официальный курс валют[\s\S]*?)<\/table>/i);
            if (!table) {
                throw new AnyBalance.Error('Не удалось найти таблицу с курсами! Сайт изменился?');
            }

            AB.getParam(html, result, 'course_USD', /<a href="\/currency\/nbu\/usd\/">ДОЛЛАР<\/a>[^]*?<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
            AB.getParam(html, result, 'course_EUR', /<a href="\/currency\/nbu\/eur\/">ЕВРО<\/a>[^]*?<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
            AB.getParam(html, result, 'course_RUB', /<a href="\/currency\/nbu\/rub\/">РУБЛЬ<\/a>[^]*?<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        }
    } else {
        // Валютный аукцион
        getCRFromHeader(result, 'sell_usd', 'purchase_usd', baseurl + 'currency/auction/usd/buy/all/');
        getCRFromHeader(result, 'sell_eur', 'purchase_eur', baseurl + 'currency/auction/eur/buy/all/');
        getCRFromHeader(result, 'sell_rub', 'purchase_rub', baseurl + 'currency/auction/rub/buy/all/');
    }
    
	AnyBalance.setResult(result);
}