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

    var baseurl = "http://www.raduga-tv.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'supports/check-card', g_headers);

    var form = getParam(html, null, null, /<form[^>]+id="check-card-form"[^>]*>([\s\S]*?)<\/form>/i);    
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form);
    params['number'] = prefs.login;

    html = AnyBalance.requestPost(baseurl + 'supports/check-card', params, addHeaders({Referer: baseurl + 'supports/check-card'})); 

    if(/class="error_txt"/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="error_txt"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'number', /<div[^>]+class=\\'def_content\\'[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\\\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<div[^>]+class=\\'def_content\\'[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\\\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<div[^>]+class=\\'def_content\\'[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\\\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balanceBal', /<div[^>]+class=\\'def_content\\'[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\\\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'endDateBasovii', /<td>Базовый пакет Радуга ТВ(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\\\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'endDateDostup', /<td>Доступ к сети Радуга ТВ(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\\\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'endDateDostupnii', /<td>Доступный пакет Радуга ТВ(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\\\/td>/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}
