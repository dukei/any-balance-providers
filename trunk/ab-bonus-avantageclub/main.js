/**
Бонусная карта сети магазинов Улыбка Радуги (http://any-balance-providers.googlecode.com)

Получает баланс карты и другую информацию из личного кабинета магазина Улыбка Радуги  

Operator site: http://r-ulybka.ru/
Личный кабинет: http://avantageclub.ru/
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

    var baseurl = "http://avantageclub.ru/";

    AnyBalance.setDefaultCharset('UTF-8'); 

    var html = AnyBalance.requestPost(baseurl + 'cabinet/login', {
        "email_":prefs.login,
        "password_":prefs.password
    }, addHeaders({Referer: baseurl + 'cabinet/'})); 

    if(!/\/cabinet\/logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /На карте:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<span[^>]*>Ваше Имя:<\/span>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'number', /<span[^>]*>Номер карты:<\/span>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'email', /<span[^>]*>EMail:<\/span>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /<span[^>]*>Телефон:<\/span>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
