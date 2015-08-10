/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс из системы Ubank 

Operator site: http://ubank.ru/
Личный кабинет: https://account.ubank.su/ru/
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

    var baseurl = "https://account.ubank.net/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'do/user.signin/', {
        code: '+7',
        phone: prefs.login,
        wp: prefs.password
    }, addHeaders({Referer: baseurl + 'ru/'})); 

    console.log(html);

    if(!/\/do\/account\.signout\//i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="notice r3 invalid"[^>]*>[\s\S]*?<span[^>]+class="description"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /<a[^>]+class="balance"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance'], /<a[^>]+class="balance"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseCurrency);

    AnyBalance.setResult(result);
}
