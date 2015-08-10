/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Obtains plan information on T-Mobile account

Operator site: http://www.t-mobile.com/
Личный кабинет: http://ma.web2go.com (mobile site)
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

    var baseurl = "https://my.t-mobile.com/";
    AnyBalance.setDefaultCharset('utf-8');

    if(prefs.__dbg){
        var html = AnyBalance.requestGet('http://ma.web2go.com/home.do', g_headers);
    }else{
        var html = AnyBalance.requestGet('https://auth.web2go.com/auth/validate.do?username=' + prefs.login + '&password=' + prefs.password + '&redirectUrl=http%3A%2F%2Fma.web2go.com%2Fmyaccount%2Fhome.do%3Fsrc%3Datmo%26ctx%3Dnone%2F&source=myaccount%2F', g_headers);
    } 

    if(!/Balance & Usage Information/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color="red"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, '__tariff', /Plan Status\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Account Balance\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /Use By\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, '2pay', /Amount Needed To Renew\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Plan Status\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'min', /<dt>\s*<b>\s*Minutes[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sms', /<dt>\s*<b>\s*Messages[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /<dt>\s*<b>\s*Data[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseTraffic);

    AnyBalance.setResult(result);
}
