/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Retrieves balance, status and renewal date from DU personal account.

Operator site: http://www.du.ae
Personal account: https://selfcare.du.ae/selfcare-portal-web/nonLoggedInSelfcare.portal
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

    var baseurl = "https://selfcare.du.ae/";
    AnyBalance.setDefaultCharset('iso-8859-1'); 

    var html = AnyBalance.requestPost(baseurl + 'cleartrust/ct_logon_en.html', {
        auth_mode:'basic',
        orig_url:'/selfcare-portal-web/Selfcare.portal?_nfpb=true',
        user:prefs.login,
        password:prefs.password,
        timestamp:'null'
    }, addHeaders({Referer: baseurl + 'selfcare-portal-web/nonLoggedInSelfcare.portal'})); 
    
    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color="red"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('The login attempt has failed. Is the site changed?');
    }
    
    var result = {success: true};

    getParam(html, result, 'fio', /Welcome(?:[\s\S]*?<span[^>]*>){1}\s*,([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    var contract = getParam(html, null, null, /<input[^>]+name="AccountOverviewController_3[^<]*value="([^"]*)/i, null, html_entity_decode);
    
    html = AnyBalance.requestGet(baseurl + 'selfcare-portal-web/selfcare/portal/userManagement/web/accountoverview/respondToAjaxRequests.do?tagID=AccountBalanceDiv%2C1%2C&locale=en&actionNames=getPrepaidAccountBalance%2C&contrract=' + contract + '&rndm=' + new Date().getTime());

    getParam(html, result, '__tariff', /<th[^>]*>\s*Balance type(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<th[^>]*>\s*Balance type(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /<th[^>]*>\s*Balance type(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    
    getParam(prefs.login, result, 'phone', null, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
