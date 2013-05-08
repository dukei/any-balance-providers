/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Eldorado

Сайт оператора: http://eldorado.ru/
Личный кабинет: http://www.club.eldorado.ru/enter.php
*/

var g_headers = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "http://www.eldorado.ru/";

    var html = AnyBalance.requestPost(baseurl + '_ajax/userCardAuth.php', {
        card:prefs.login,
        pin:prefs.password,
        auth_popup:true
    }, addHeaders({Referer: baseurl + 'personal/?loyalty', 'X-Requested-With': 'XMLHttpRequest'}));

    var json = getJson(html);
    if(!json.data){
        throw new AnyBalance.Error(json.error || 'Не удаётся войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '_ajax/getUserCardBonus.php', addHeaders({Referer: baseurl + 'personal/?loyalty', 'X-Requested-With': 'XMLHttpRequest'}));

    var result = {success: true};

    getParam(html, result, 'balance', /(\d+) активных/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'reserv', /(\d+) неактивных/i, replaceFloat, parseBalance);

    if(AnyBalance.isAvailable('cardnum', 'phone', 'userName')){
        html = AnyBalance.requestGet(baseurl + 'personal/club/enter/', g_headers);

        getParam(html, result, 'cardnum', /Номер карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'userName', /ФИО владельца:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'phone', /Телефон:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    AnyBalance.setResult(result);
}

