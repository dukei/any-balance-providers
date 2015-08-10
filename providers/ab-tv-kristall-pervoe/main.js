/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для сотового оператора xxxxxx 

Operator site: http://xxxxxx.ru
Личный кабинет: https://kabinet.xxxxxx.ru/login
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://lk.kristall-pervoe.tv/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'login', {
        city:prefs.town,
        login:prefs.login,
        password:prefs.password,
        authtype_alt:'0'
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<img[^>]+src="\/images\/layout\/!\.png"[^>]*><\/img><\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    AnyBalance.requestGet(baseurl + 'login', g_headers);

    html = AnyBalance.requestGet(baseurl + 'infoline/head_view', g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /title="договор"[^>]*>([\s\S]*?)<br>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<a[^>]+href=\"\/account\/balance\"[^>]*>([\s\S]*?)<br>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /title="в копилке"[^>]*>([\s\S]*?)<br>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'days', /title="осталось"[^>]*>([\s\S]*?)<br>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'account/balance', g_headers);
    getParam(html, result, 'lastPeriod', /<td[^>]*>Остаток с прошлого периода<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'income', /<td[^>]*>Поступления на счёт \(всего\)<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'service', /<td[^>]*>Наработка по услугам \(всего\)<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'oneService', /Расход по разовым услугам \(всего\)<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
