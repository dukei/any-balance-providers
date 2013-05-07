/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс на кошельке RBKMoney

Operator site: http://rbkmoney.ru
Личный кабинет: https://rbkmoney/login.aspx
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
    var baseurl = "https://rbkmoney.ru/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);

    var form = getParam(html, null, null, /<form[^>]+name="aspnetForm"[^>]*>([\s\S]*?)<\/form>/i);    

    if(!form) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form);
    params['ctl00$ContentPlaceHolder$loginTextBox$dd$valueTextBoxId'] = prefs.login;
    params['ctl00$ContentPlaceHolder$passwordTextBox$dd$valueTextBoxId'] = prefs.password;
// !!! не находит параметры ctl00$ContentPlaceHolder$bb и ctl00$searchControl$_tbSearch

    html = AnyBalance.requestPost(baseurl + 'login.aspx', params, addHeaders({Referer: baseurl + 'login.aspx'})); 

    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="error"[^>]*>[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }


    var result = {success: true};
    getParam(html, result, 'pursenumber', /<div[^>]+class="w_number"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<a[^>]+class="tooltip"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance); 
    getParam(html, result, 'fio', /<a[^>]+id="ctl00_user_userName__actionHyperLink"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);   
    getParam(html, result, 'purse', /Кошелек:([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
