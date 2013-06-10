/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)


Получает баланс и другую информацию для интернет провайдера Nextone 

Operator site: http://www.next-one.ru/
Личный кабинет: https://st.coltel.ru/account
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

    var baseurl = "https://st.coltel.ru/";

    AnyBalance.setDefaultCharset('WINDOWS-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'login', {
        "LoginForm[username]":prefs.login,
        "Submit":"ok",
        "LoginForm[password]":prefs.password,
        "yt0.x":45,
        "yt0.y":8
    }, addHeaders({Referer: baseurl})); 


    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<td[^>]*id="user_name_header"[^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cost', /<th[^>]+>Стоимость<\/th>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<th[^>]+>Стоимость<\/th>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'average', /Средний чек:\s*([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /Баланс\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'experience', /Стаж:\s*([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'date', /<th[^>]*>Дата окончания<\/th>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
   
    AnyBalance.setResult(result);
}
