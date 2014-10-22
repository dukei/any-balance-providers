/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)

Reads the information from Handelsbanken account (http://m.handelsbanken.se)

Bank website: http://handelsbanken.se
Internet banking: http://m.handelsbanken.se

Author: valeravi (valeravi@vi-soft.com.ua)
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

    var baseurl = "https://m.handelsbanken.se/";

    AnyBalance.setDefaultCharset('utf-8'); 

   	AnyBalance.trace('GET: ' + baseurl + 'primary/');
    html = AnyBalance.requestGet(baseurl + 'primary/');
   	AnyBalance.trace('GET: ' + baseurl + ' ... OK');
   	
   	loggain = html.match(/<a[\s\S]*?href="\/([\s\S]*?)"[\s\S]*?<span class="menu-text">Logga in<\/span>/i)[1];
    AnyBalance.trace('loggain: ' + loggain);

    AnyBalance.trace('POST: ' + baseurl + loggain);
    html = AnyBalance.requestPost(baseurl + loggain, {
        username:prefs.login,
        pin:prefs.password,
        execute:'true'
    }, addHeaders({Referer: baseurl + loggain})); 
    AnyBalance.trace('POST: ' + baseurl + loggain + ' ... OK');

    if(!/Logga ut/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Failed to enter to the internet banking. Web site may changed or temporarily down.');
    }
    
    konton = html.match(/<a[\s\S]*?href="\/([\s\S]*?)"[\s\S]*?<span class="menu-text">Konton<\/span>/i)[1];
    AnyBalance.trace('konton: ' + konton);

   	AnyBalance.trace('GET: ' + baseurl + konton);
    html = AnyBalance.requestGet(baseurl + konton, addHeaders({Referer: baseurl + loggain}));
   	AnyBalance.trace('GET: ' + baseurl + konton + ' ... OK');
    
    var result = {success: true};
    getParam(html, result, '__tariff', /item_1[\s\S]*?block-link[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accnum', /item_1[\s\S]*?link-list-left[\s\S]*?>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /item_1[\s\S]*?link-list-right[\s\S]*?> [a-z]*([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency','balance'], /item_1[\s\S]*?link-list-right[\s\S]*?> ([a-z]*)[\S\s]*?<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
