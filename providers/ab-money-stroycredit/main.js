/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о карте в банке "Стройкредит".

Сайт: http://stroycredit.ru
ЛК: https://card.stroycredit.ru
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://card.stroycredit.ru/cards/';

//    var html = AnyBalance.requestGet(baseurl, g_headers);

    var html = AnyBalance.requestPost(baseurl + 'SimpleLogon.do', {
        logonCN:prefs.login,
        logonPassword:prefs.password
    }, g_headers);

    if(!/cards\/logout.do/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="boxcontent"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в систему Инфо-кард. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'Balance.do', g_headers);
    
    var result = {success: true};

    getParam(html, result, 'balance', /Доступные средства[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Валюта(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'blocked', /Всего заблокировано[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'limit', /Кредитный лимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Баланс по карточному счету #([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
