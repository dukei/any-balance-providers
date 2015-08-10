/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о договоре в системе Ренесанс Life & Pensions 

Operator site: http://www.renlife.com/
Личный кабинет: https://lifecabinet.renlife.com/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://lifecabinet.renlife.com/";

    AnyBalance.setDefaultCharset('utf-8'); 
    AnyBalance.requestGet(baseurl + 'user/login', g_headers);

    var html = AnyBalance.requestPost(baseurl + 'user/login_check', {
        _username:prefs.login,
        _password:prefs.password
    }, addHeaders({Referer: baseurl + 'user/login'})); 


    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<form[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var table = getParam(html, null, null, /<h1[^>]*>Информация о договорах<\/h1>\s*<table[\s\S]*?<\/table>/);
    if(!table)
        throw new AnyBalance.Error('Не найдена информация о договорах');

    var tr = getParam(table, null, null, new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '') + '<\/a>[\\s\\S]*?<\/tr>', "i"));
    if(!tr)
        throw new AnyBalance.Error(prefs.number ? 'Не найдено договора с последними цифрами ' + prefs.number : 'Не найдено ни одного договора');

    AnyBalance.trace('Found row: ' + tr);

    getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'dateBegin', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'dateEnd', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    getParam(tr, result, 'payPeriod', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'fee', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'indexFee', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'datePay', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'debtFee', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(tr, result, 'num', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var id=getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(AnyBalance.isAvailable('total')){
        html = AnyBalance.requestGet(baseurl + 'order/' + id);
        sumParam(html, result, 'total', /<td[^>]*>([^<]*)<\/td>\s*(?:<td[^>]*>[^<]*<\/td>\s*)<td[^>]*>Оплачен/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }


    AnyBalance.setResult(result);
}
