/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию об успехах консультанта Oriflame Украина.

Сайт оператора: https://ua-eshop.oriflame.com
Личный кабинет: http://vip.oriflame.ua 
*/

var g_baseurl = "https://ua-eshop.oriflame.com/eShop/";
var g_headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control':'max-age=0',
        'Connection':'keep-alive',
        'Referer':g_baseurl,
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
};

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = g_baseurl;

    var html = AnyBalance.requestGet(baseurl + 'Login.aspx');

    html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
        ctl00_RadScriptManager1_TSM:'',
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:'',
        __EVENTVALIDATION:getEventValidation(html),
        ctl00$cphContent$txtUser:prefs.login,
        ctl00$cphContent$password:prefs.password,
        ctl00$cphContent$btnLogin:'Войти в систему'
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/eShop\/Logout.aspx/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="[^"]*pnlErrorPanel"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + 'Reports/BusActReport.aspx', g_headers);

    var result = {success: true};

    getParam(html, result, 'bp', /<span[^>]+id="[^"]*lbl_Rep_\d+_BP"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bv', /<span[^>]+id="[^"]*lbl_Rep_\d+_BV"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'ebp', /<span[^>]+id="[^"]*lbl_Rep_\d+_EXCLUSIVE_BP"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'ebv', /<span[^>]+id="[^"]*lbl_Rep_\d+_EXCLUSIVE_BV"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'da', /<span[^>]+id="[^"]*lbl_Rep_\d+_DISCOUNT_AMOUNT"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'ob', /<span[^>]+id="[^"]*lbl_Rep_\d+_OTHER_BONUSES"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lc', /<span[^>]+id="[^"]*lbl_Rep_\d+_LC_BONUS"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cl', /<span[^>]+id="[^"]*lbl_Rep_\d+_CREDIT_LIMIT"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bpr', /<span[^>]+id="[^"]*lbl_Rep_\d+_BP_TO_NEXT_RATE"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nr', /<span[^>]+id="[^"]*lbl_Rep_\d+_NEXT_RATE"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'num', /<span[^>]+id="[^"]*lblDistNum"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<span[^>]+id="[^"]*lbl_Rep_\d+_DIST_NAME"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<span[^>]+id="[^"]*lbl_Rep_\d+_DIST_NAME"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
