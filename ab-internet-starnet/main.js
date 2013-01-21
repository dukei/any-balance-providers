/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для молдавского интернет-провайдера StarNet.

Сайт оператора: http://starnet.md
Личный кабинет: http://my.starnet.md
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17'
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://my.starnet.md/";

    var html = AnyBalance.requestPost(baseurl + 'user/login', {
        login:prefs.login,
        pass:prefs.password,
        submit:'Intră',
    }, g_headers);

    if(!/\/user\/logout/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var result = {success: true};

    if(AnyBalance.isAvailable('balance', 'tariffInternet')){
        html = AnyBalance.requestGet(baseurl + 'internet', addHeaders({Referer:baseurl}));
        getParam(html, result, 'balance', /(?:Sold|Текущий баланс):\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        sumParam(html, result, '__tariff', /<table[^>]+class="gridtable"[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        getParam(html, result, 'tariffInternet', /<table[^>]+class="gridtable"[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('balanceVoice', 'tariffVoice', 'limitVoice', 'phonesVoice')){
        html = AnyBalance.requestGet(baseurl + 'starvoice', addHeaders({Referer:baseurl}));
        getParam(html, result, 'balanceVoice', /(?:Sold|Текущий баланс):\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        sumParam(html, result, '__tariff', /<table[^>]+class="gridtable"[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        getParam(html, result, 'tariffVoice', /<table[^>]+class="gridtable"[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'limitVoice', /<table[^>]+class="gridtable"(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'phonesVoice', /<table[^>]+class="gridtable"(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('tariffTv')){
        html = AnyBalance.requestGet(baseurl + 'iptv/abonament', addHeaders({Referer:baseurl}));
        sumParam(html, result, '__tariff', /<table[^>]+class="gridtable"[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        getParam(html, result, 'tariffTv', /<table[^>]+class="gridtable"[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('bonus')){
        html = AnyBalance.requestGet(baseurl + 'fidelity', addHeaders({Referer:baseurl}));
        getParam(html, result, 'bonus', /<table[^>]+class="gridtable"(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'bonusTotal', /<table[^>]+class="gridtable"(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
