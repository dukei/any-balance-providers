/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для питерского интернет-провайдера Westcall.

Сайт оператора: http://westhome.spb.ru/
Личный кабинет: https://console.westhome.spb.ru/
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    'Connection':'keep-alive',
    'Origin':'https://console.westhome.spb.ru',
    'Referer':'https://console.westhome.spb.ru/',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17'
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://console.westhome.spb.ru/";

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl, {
            login_process: 'processing',
            login: prefs.login,
            passwd: prefs.password
        }, g_headers);
    }else{
        var html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);
    }

    if(!/\?logout=processing/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="error"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Остаток:[\s\S]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pay', /Рекомендуемая сумма к оплате[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paytill', /Рекомендуемая дата оплаты[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'bonus_traffic', /Остаток бонусного трафика:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'free_traffic', /Входящий бесплатный трафик:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, '__tariff', /<h1[^>]*>\s*Тарифный план:[\s\S]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счет[\s\S]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
