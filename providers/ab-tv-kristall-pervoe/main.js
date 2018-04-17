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

    var html = AnyBalance.requestPost(baseurl + 'login.php', {
        city:prefs.town,
        login:prefs.login,
        password:prefs.password,
        authtype_alt:'0'
    }, addHeaders({Referer: baseurl + 'login.php'}));

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class\s*=\s*"login-msg"[^>]*>[\s\S]*?<strong[^>]*>([\s\S]*?)<ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error,  null, /Ошибка авторизации!/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};

    getParam(html, result, 'fio', /fa-user(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /баланс(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /бонусы(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'days', /До конца учетного периода(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl+ 'pay.php', g_headers);

    getParam(html, result, 'lastPeriod', /<td[^>]*>Остаток с пред\.месяца<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'income', /<td[^>]*>Поступления<\/td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'service', /<td[^>]*>Наработка<\/td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'oneService', /Расход<\/td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);


    AnyBalance.setResult(result);
}
