/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для сайта Gnezdo.ru новости 

Operator site: http://www.gnezdo.ru/
Личный кабинет: http://news.gnezdo.ru/cgi-bin/admin/login.cgi
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

    var baseurl = "http://news.gnezdo.ru/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'cgi-bin/admin/auth.cgi', {
        login:prefs.login,
        password:prefs.password,
        submit:"%C2%EE%E9%F2%E8"
    }, addHeaders({Referer: baseurl + 'cgi-bin/admin/auth.cgi'}));

    if(!/\/logout\.cgi/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class='system_message error'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /<a[^>]+class='credit_sum'[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'coef', /<th>Коэффициент обмена:<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'update', /<th>Данные обновлены:<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}
