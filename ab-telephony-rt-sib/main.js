/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    var baseurl = "https://ispa.sibirtelecom.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
//    return getRegions();

    var html = AnyBalance.requestPost(baseurl + 'index.jsp', {
        needauth:'yes',
        asr:prefs.region,
        account:prefs.login,
        pwd:prefs.password
    }, addHeaders({Referer: baseurl + 'index.jsp'})); 

    if(!/action=logout/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color="red"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'licschet', /Лицевой счет №:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Лицевой счет №:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    sumParam(html, result, '__tariff', /<th[^>]*>[^<]*\/([^<]*)\//ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    sumParam(html, result, 'balance', /Сумма к оплате на\s*[\d\/]*\s*составляет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'recom', /Сумма рекомендованного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    if(AnyBalance.isAvailable('dur', 'cost', 'count')){
        var dt = new Date();
        html = AnyBalance.requestGet(baseurl + 'index.jsp?action=apusd&period_from=' + dt.getFullYear() + (dt.getMonth() < 9 ? '0' : '') + (dt.getMonth()+1), g_headers);
        getParam(html, result, 'count', /Итого разговоров по телефону[^<]*?:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'dur', /Длительность:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cost', /Сумма:[^<]*?[cс] НДС:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function getRegions(result){
    var html = AnyBalance.requestGet('https://ispa.sibirtelecom.ru/index.jsp');
    var select = getParam(html, null,null, /<select[^>]+name='asr'[^>]*>([\s\S]*?)<\/select>/i);
    var result = {success: true};
    if(select){
        sumParam(select, result, 'entries', /<option[^>]*>(?:Испа, )?([\s\S]*?)<\/option>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join('|'));
        sumParam(select, result, 'entryValues', /<option[^>]*value='([^']*)/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join('|'));
    }
    AnyBalance.setResult(result);
}