/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для интернет провайдера Новые Технологии города Клинцы 

Operator site: http://billing.k-nt.ru/
Личный кабинет: http://billing.k-nt.ru/index:cabinet.ib
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

    var baseurl = "http://billing.k-nt.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'index:cabinet.ib', {
        plogin:prefs.login,
        password:prefs.password,
        x: '43',
        y: '11'
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/\/index\.ib\?logoff=1/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errhead"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /Плательщик:([\s\S]*?)<br\/>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс плательщика:([\s\S]*?)<br\/>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balanceSum', /Суммарный месячный платёж:([\s\S]*?)<a/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /Идентификатор плательщика:([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
