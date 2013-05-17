/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс кошелька системы электронных платежей EasyPay (https://easypay.ua)

Operator site: http://xxxxxx.ru
Личный кабинет: https://kabinet.xxxxxx.ru/login
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

    var baseurl = "https://easypay.ua/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'auth/signin', {
        login:prefs.login,
        password:prefs.password
    }, addHeaders({Referer: baseurl + 'auth/signin'})); 

    if(!/class="exit"/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="error1"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true},
        reg = new RegExp("<tr>\\s*<td[^>]*>" + prefs.number + "<\/td>\\s*<td[^>]*>([\\s\\S]*?)<\/td>", "i");
    getParam(html, result, 'balance', reg, replaceTagsAndSpaces, parseBalance);

    console.log(reg); 

    AnyBalance.setResult(result);
}
