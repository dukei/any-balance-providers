/**
Карта подарки по дороге (http://any-balance-providers.googlecode.com)

Получает баланс карты "Подарки по дороге" (http://www.podarok.rn-card.ru/)

Информация берется из личного кабинета: http://www.podarok.rn-card.ru/cabinet

Operator site: http://www.podarok.rn-card.ru/
Личный кабинет: http://www.podarok.rn-card.ru/cabinet
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

    var baseurl = "http://www.podarok.rn-card.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);

    var form = getParam(html, null, null, /<form[^>]+id="-forte-cabinet-form"[^>]*>([\s\S]*?)<\/form>/i);    

    if(!form) 
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form);
    params['number'] = prefs.login;

    html = AnyBalance.requestPost(baseurl + 'cabinet', params, addHeaders({Referer: baseurl + 'cabinet'})); 

    var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>[\s\S]*<\/h2>\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};
    getParam(html, result, 'balance', /<input[^>]+id="edit-bonus"[^>]+value=\"([\s\S]*?)\"/i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
