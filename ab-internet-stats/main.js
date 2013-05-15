/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и другую информацию для интерент провайдера Связь ТехноСервис

Operator site: http://www.stsats.ru/
Личный кабинет: http://cab.stsats.ru/
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

    var baseurl = "http://cab.stsats.ru/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'index.php', {
        l:prefs.login,
        p:prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/logout\.php/i.test(html)){
        var error = getParam(html, null, null, /alert\(\'([\s\S]*?)\'/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /Добро пожаловать в тестовый кабинет,\s*([\s\S]*?)!/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'id', /Ваш персональный ID:\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "wrapper.php?cclass_id=17", g_headers);

    if (/wrapper\.php\?v_s=26/i.test(html)) {      
        html = AnyBalance.requestGet(baseurl + "wrapper.php?v_s=26", g_headers);
        html = AnyBalance.requestGet(baseurl, g_headers);

        getParam(html, result, 'balance', /Баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'promise', /Сумма обещанных платежей:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'ipStatus', /Состояние IP адресов:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'period', /Текущий период:\s*([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);  
    }

    if (/wrapper\.php\?v_s=27/i.test(html)) {            
        html = AnyBalance.requestGet(baseurl + "wrapper.php?v_s=27", g_headers);
        html = AnyBalance.requestGet(baseurl, g_headers);

        getParam(html, result, 'balancePhone', /Баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'promisePhone', /Сумма обещанных платежей:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    }

    if (/wrapper\.php\?v_s=32/i.test(html)) {            
        html = AnyBalance.requestGet(baseurl + "wrapper.php?v_s=32", g_headers);
        html = AnyBalance.requestGet(baseurl, g_headers);

        getParam(html, result, 'balanceWimax', /Баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'promiseWimax', /Сумма обещанных платежей:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
