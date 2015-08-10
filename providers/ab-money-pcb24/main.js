/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Петрокоммерц через систему Выписка Онлайн

Сайт оператора: http://www.pkb.ru/
Личный кабинет: https://pcb24.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://pcb24.ru/v1/cgi/bsi.dll?";
    
    var headers = {
        'Accept-Language': 'ru, en',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
    }

    html = AnyBalance.requestPost(baseurl, {
        LG:prefs.login,
        PW:prefs.password,
        T:'RT_w3c_10Loader.RProcess',
        R:'LOGIN'
    }, headers);

    var sid = getParam(html, null, null, /&SID=([^']*)/);
    if(!sid){
//    if(!/toolbar\/exit.gif/.test(html)){
        var error = getParam(html, null, null, /<TD[^>]+ID="CLT"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в систему. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'T=RT_w3c_10Loader.RProcess&R=CARDREQ&SID=' + sid, headers);

    fetchCard(sid, html, headers, baseurl);
}

function fetchCard(sid, html, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var cardnum = prefs.cardnum || '\\d{4}';

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!</tr>))*?<td[^>]+id="cardnum"[^>]*>[^<]*' + cardnum + '</td>[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));

    var result = {success: true};
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'available', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'fio', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    AnyBalance.setResult(result);
}

