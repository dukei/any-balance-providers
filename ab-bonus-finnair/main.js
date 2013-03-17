/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс баллов и другую информацию по бонусной программе Finnair

Operator site: https://www.finnair.com
Личный кабинет: http://www.finnair.com/INT/GB/plus/my-finnair-plus
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Cache-Control': 'max-age=0',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
};

function getMyJson(str){
    var json = getParam(str, null, null, /^\s*authResult\((\{[\s\S]*\})\);/);
    if(!json){
        AnyBalance.trace('Wrong server answer: ' + str);
        throw new AnyBalance.Error('Server returned bad answer. The server is down or has been changed.');
    }
    return getJson(json);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.finnair.com/";
    AnyBalance.setDefaultCharset('utf-8'); 

    //Теперь, когда секретный параметр есть, можно попытаться войти
    var html = AnyBalance.requestGet(baseurl + 'pl/AYPortal/wds/Login.action?SITE=FINRFINR&LANGUAGE=GB&COUNTRY_SITE=INT&PAGE=PMYA&PRF_PROFILE_TYPE=member&USER_ID=' + encodeURIComponent(prefs.login) + '&PASSWORD_1=' + encodeURIComponent(prefs.password), addHeaders({Referer: baseurl, Origin: baseurl.replace(/\/$/, '')})); 
    var json = getMyJson(html);

    if(json.ERROR_DESCRIPTION)
        throw new AnyBalance.Error(replaceAll(json.ERROR_DESCRIPTION, replaceTagsAndSpaces));

    if(!json.USER_ID){
        throw new AnyBalance.Error('Could not login to the personal account. Is site changed?');
    }

    var result = {success: true};

    getParam(json.FIRST_NAME + ' ' + json.LAST_NAME, result, 'fio');
    getParam('Level ' + json.ACCOUNT_LEVEL, result, '__tariff');
    getParam(json.USER_ID, result, 'num');
    getParam(json.MILEAGE, result, 'balance', null, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('tier_points', 'flights', 'tier_points_total', 'begin', 'end')){
        html = AnyBalance.requestGet(baseurl + 'INT/GB/finnair-plus/my-finnair-plus/point-info');

        getParam(html, result, 'tier_points', /Tier points collected during this tracking period[\s\S]*?<span[^>]+class="data"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'tier_points_total', /Lifetime tier points[\s\S]*?<span[^>]+class="data"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

        var AYTS = getParam(html, null, null, /AYTS=(\d+)/);
        if(AnyBalance.isAvailable('flights', 'begin', 'end')){
            html = AnyBalance.requestGet(baseurl + 'pl/AYPortal/wds/GetPointBalance.action?PAGE=POIN&COUNTRY_SITE=INT&AYTS=' + AYTS + '&LANGUAGE=GB&SITE=FINRFINR');
            json = getJson(html);

            getParam(json.trackingPeriodEnd, result, 'end', null, null, parseDateISO);
            getParam(json.trackingPeriodStart, result, 'begin', null, null, parseDateISO);
            getParam(json.flightsFlown, result, 'flights', null, null, parseBalance);
        }
    }

    AnyBalance.setResult(result);
}
