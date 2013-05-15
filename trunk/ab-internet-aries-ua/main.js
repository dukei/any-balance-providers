/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, информацию о кредите и последнем платеже для интернет провайдера Aries (http://www.aries.net.ua/)

Operator site: http://www.aries.net.ua/
Личный кабинет: http://cabinet.aries.net.ua/
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

    var baseurl = "http://cabinet.aries.net.ua/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'login/', {
        login:prefs.login,
        password:prefs.password
    }, addHeaders({Referer: baseurl + 'login/'})); 

    if(!/value="Выйти"/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="flash_error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'kredit', /Кредит:([\s\S]*?)<br \/>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'lastPayDate', /Последние платежи:(?:[\s\S]*?<i[^>]*>){1}([\s\S]*?)<\/i>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lastPayBalance', /Последние платежи:(?:[\s\S]*?<b>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastPayStatus', /Последние платежи:(?:[\s\S]*?<\/b>){1}\s*\(([\s\S]*?)\)/i, replaceTagsAndSpaces, html_entity_decode);


    AnyBalance.setResult(result);
}
