/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

 Получает баланс, номер счета и информацию о последнем платеже в системе Internet Платёжка 

Operator site: http://www.krasplat.ru
Личный кабинет: https://www.krasplat.ru/index.php
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31',
'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://www.krasplat.ru/",
        baseurlS = "https://www.krasplat.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'index.php/auth/mif', {id_elm: 'login'}, addHeaders({Referer: baseurl}));

    var form = getParam(html, null, null, /<form[^>]*name="frm_auths"[^>]*>([\s\S]*?)<\/form>/i);    
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    AnyBalance.requestPost(baseurl + 'index.php/auths/ajax/data/qaptcha', {action: "qaptcha"}, addHeaders({Referer: baseurl}));

    var params = createFormParams(form);
    params["frm_auths[Fields][Login]"] = prefs.login.replace(/([\d]{3})([\d]{3})([\d]{2})([\d]{2})/i, "+7($1)$2-$3-$4");
    params["frm_auths[Fields][Password]"] = prefs.password;
    params["iQapTcha"] = "";

    html = AnyBalance.requestPost(baseurl + 'index.php/auth/logon', params, addHeaders({Referer: baseurl}));

    if(!/window\.location\.href/i.test(html)){
        var error = getParam(html, null, null, /<center[^>]*>([\s\S]*?)<\/center>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
    }

    AnyBalance.requestGet(baseurlS + "index.php", addHeaders({Referer: baseurl + ''}));

    var result = {success: true};

    html = AnyBalance.requestGet(baseurlS + "index.php/balans/ajax/data/balance", addHeaders({Referer: baseurlS + 'index.php'}));

    getParam(html, result, 'number', /<Card_Number>([\s\S]*?)<\/Card_Number>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<Balans_Value>([\s\S]*?)<\/Balans_Value>/i, replaceTagsAndSpaces, parseBalance);

    // последние платежи
    html = AnyBalance.requestGet(baseurlS + "index.php/mypays/my_pays_list_simpl", addHeaders({Referer: baseurlS + 'index.php'}));

    getParam(html, result, 'lastDate', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'lastNumber', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lastBalance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
