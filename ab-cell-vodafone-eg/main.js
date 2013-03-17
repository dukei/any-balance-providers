/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плате для сотового оператора Vodafone Egypt

Operator site: https://www.vodafone.com.eg
Личный кабинет: https://www.vodafone.com.eg/My010App/
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
    var baseurl = "https://www.vodafone.com.eg/";
    var baseurl1 = "http://www.vodafone.com.eg/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl1 + 'vodafoneportalWeb/en/preMyBalance_Page', g_headers);

    if(!prefs.__dbg){
        html = AnyBalance.requestPost(baseurl + 'My010App/servlets/LoginManager?userLang=en', {
            redirectToUrl:baseurl + 'vodafoneportalWeb/en/preMyBalance_Page',
            pageCodeName:'',
            pageCode:'',
            RBT_Code:'',
            RBT_ID:'',
            RBT_G:'',
            RBT_Page_Code:'',
            allQueryParams:'?redirectTo=http%3A%2F%2Fwww.vodafone.com.eg%2FvodafoneportalWeb%2Fen%2FpreMyBalance_Page',
            protocol_login:'https:',
            mobile:prefs.login,
            password:prefs.password,
            url:''
        }, addHeaders({Referer: baseurl})); 

//        AnyBalance.trace(html);

        if(!/window.open\('[^']*preMyBalance_Page/i.test(html)){
            throw new AnyBalance.Error('Could not enter personal account. Have you entered correct login and password?');
        }
    }

    html = AnyBalance.requestGet(baseurl1 + 'My010App/pre_paid/services/ResultB.jsp?lang=en&_nfpb=true&_pageLabel=preMyBalance_Page&lang=en', g_headers);
//        AnyBalance.trace(html);

    var result = {success: true};
    getParam(html, result, 'phone', /<span[^>]+class="heading1"[^>]*>Mobile(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<span[^>]+class="heading1"[^>]*>Name(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){ return html_entity_decode(str) || undefined } );
    getParam(html, result, 'accnum', /Account Number(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<span[^>]+class="heading1"[^>]*>Current Balance(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl1 + 'My010App/SessionDispatcher.jsp?pageCode=PPDCode&lang=en&_nfpb=true&_pageLabel=P12601258001323085993666&lang=en', g_headers);
//        AnyBalance.trace(html);
    getParam(html, result, '__tariff', /<span[^>]+class="currentPlan"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
