/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://minfin.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'currency/mb/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');    
    
    var course = prefs.course || '1';
    
	var result = {success: true};    
    
    if (course == '1') {
        var table = getParam(html, null, null, /(Курсы от банков[\s\S]*?)<\/table>/i);        
    
        getParam(table, result, '_tariff', /Курсы от банков/i, null, null);
        getParam(table, result, 'purchase_usd', /USD(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_usd', /USD(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
        
        getParam(table, result, 'purchase_eur', /EUR(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){6}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_eur', /EUR(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){6}/i, replaceTagsAndSpaces, parseBalance);
         
        getParam(table, result, 'purchase_rub', /RUB(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){8}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_rub', /RUB(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){8}/i, replaceTagsAndSpaces, parseBalance);
        
    } else if (course == '2') {
    
        var table = getParam(html, null, null, /(Рыночные курсы[\s\S]*?)<\/table>/i);
        
        getParam(table, result, '_tariff', /Рыночные курсы/i, null, null);    
        getParam(table, result, 'purchase_usd', /USD(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_usd', /USD(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
        
        getParam(table, result, 'purchase_eur', /EUR(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_eur', /EUR(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
        
        getParam(table, result, 'purchase_rub', /RUB(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){6}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_rub', /RUB(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){6}/i, replaceTagsAndSpaces, parseBalance);
        
    } else if (course == '3')  {
    
        getParam(html, result, '_tariff', /(Индикативные курсы НБУ на[\s\S]*?):<\//i, replaceTagsAndSpaces, html_entity_decode);   
        getParam(html, result, 'course_date', /Индикативные курсы НБУ на([\s\S]*?):<\//i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'course_USD', /Индикативные курсы НБУ на(?:[^>]*>){2}доллар&nbsp;([^;]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'course_EUR', /Индикативные курсы НБУ на(?:[^>]*>){2}[\s\S]*?евро&nbsp;([^;]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'course_RUB', /Индикативные курсы НБУ на(?:[^>]*>){2}[\s\S]*?рубль&nbsp;([\s\S]*?)\.\s*?</i, replaceTagsAndSpaces, parseBalance);  
        
    } else {
    
        html = AnyBalance.requestGet(baseurl + 'currency/auction/', g_headers);
        
        if(!html || AnyBalance.getLastStatusCode() > 400)
            throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');  
            
        var table = getParam(html, null, null, /(<h1>Валютный аукцион[\s\S]*?)<\/table>/i);
    
        getParam(table, result, '_tariff', /Валютный аукцион/i, null, null);
        getParam(table, result, 'purchase_usd', /USD(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_usd', /USD(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
        
        getParam(table, result, 'purchase_eur', /EUR(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){6}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_eur', /EUR(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){6}/i, replaceTagsAndSpaces, parseBalance);
         
        getParam(table, result, 'purchase_rub', /RUB(?:[\s\S]*?<tr[^>]*>){1}([^>]*>){8}/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'sell_rub', /RUB(?:[\s\S]*?<tr[^>]*>){2}([^>]*>){8}/i, replaceTagsAndSpaces, parseBalance);
        
    }
    
	AnyBalance.setResult(result);
}