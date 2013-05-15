/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает количество баллов бонусной карты компании Shell в Украине

Operator site: http://shellsmart.com.ua/
Личный кабинет: https://shellsmart.com.ua/ru/account
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

    var baseurl = "https://shellsmart.com.ua/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'ru/account/login', {
        "form[login]":prefs.login,
        "form[pass]":prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(/[\s\S]*?\.html/i.test(html)){
        var error = getParam(html, null, null, /(?:[\s\S]*?\.html){2}\(\'([\s\S]*?)\'/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    html = AnyBalance.requestGet(baseurl + 'ru/account', g_headers); 

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="page_name_account l"[^>]*>[\s\S]*?,\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    
    html = AnyBalance.requestGet(baseurl + 'ru/account/view', g_headers); 

    getParam(html, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'allbalance', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
