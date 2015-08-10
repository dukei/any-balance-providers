/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает различные показатели партнера программы WorldGMN (http://www.worldgmn.com).

Сайт оператора: http://www.worldgmn.com
Личный кабинет: http://www.worldgmn.com/login.php
*/

var g_baseurl = "https://www.worldgmn.com/";
var g_headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control':'max-age=0',
        'Connection':'keep-alive',
        'Referer':g_baseurl,
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = g_baseurl;

    var html = AnyBalance.requestPost(baseurl + 'login.php', {
        email:prefs.login,
        password:prefs.password,
        task:'dologin',
        return_url:''
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/user_logout.php/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="loginError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + 'communicate_panel.php?r=from_ck', g_headers);

    var result = {success: true};

    getParam(html, result, 'balance', /<div[^>]+id="userBalance"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+id="ratePlan"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /<div[^>]+id="ratePlanExpires"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateISO);
    getParam(html, result, 'status', /<div[^>]+class="welcome"[^>]*>(?:[\s\S](?!<\/div))*?<i>([\s\S]*?)<\/i>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('wallet')){
        html = AnyBalance.requestGet(baseurl + 'user_accounting.php', g_headers);
        
        getParam(html, result, 'wallet', /<span[^>]+class="wl_title"[^>]*>([^<]*)<\/span>(?:[\s\S](?!<\/td>))*?<a[^>]+user_wikash_wallet_recharge.php/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('totalearn')){
        html = AnyBalance.requestGet(baseurl + 'gsi.php', g_headers);
        
        getParam(html, result, 'totalearn', /<div[^>]+class="[^"]*\s+inv"[^>]*>[\s\S]*?<div[^>]+class="[^"]*\s+fToRight"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('adkash_status', 'adkash_left', 'adkash_right', 'adkash_bonus', 'adkash_total')){
        html = AnyBalance.requestGet(baseurl + 'user_adkash.php', g_headers);
        
        getParam(html, result, 'adkash_status', /Status:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'adkash_total', /views Balance:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'adkash_left', /Left team earning:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'adkash_right', /Right team earning:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'adkash_bonus', /ADKASH BONUS:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}
