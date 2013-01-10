/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о карте, кредите, депозите в банке "ХоумКредит".

Сайт: http://www.homecredit.ru
ЛК: https://ib.homecredit.ru
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    Referer: 'https://webby.deltacredit.ru:443/bank/RSL/welcome.html',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://webby.deltacredit.ru:443/webby/';

    if(AnyBalance.getLevel() < 6)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API 6+');

    //Старый сайт имеет баг в TSL, приходится явно перейти на SSL
    AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['SSLv3']});

    var html = AnyBalance.requestPost(baseurl + 'w_welcome.rez_login', {
        name_:prefs.login,
        pass_:prefs.password
    }, g_headers);

    if(!/RSL\/menuRF\.js/i.test(html)){
        var error = getParam(html, null, null, /<h4[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    if(prefs.type == 'crd')
        fetchCredit(baseurl, html);
    else if(prefs.type == 'acc')
        fetchAccount(baseurl, html);
    else
        fetchAccount(baseurl, html); //По умолчанию счет
}

function getSid(html){
    return getParam(html, null, null, /<input[^>]+name="p_cur_sid"[^>]*value="([^"]*)/i, null, html_entity_decode);
}

function fetchAccount(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    if(!/w_cr\.inf_accounts/.test(html))
        html = AnyBalance.requestGet(baseurl + 'w_cr.inf_accounts?p_cur_sid=' + getSid(html));

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.contract || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var result = {success: true};

    var re = new RegExp('(<tr[^>]*onClick="fTableClick(?:[\\s\\S](?!<tr))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?</tr>)', 'i');

    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'счет с ID ' + prefs.contract : 'ни одного счета'));
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Имя клиента:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(!/w_cr.show_credit/.test(html))
        html = AnyBalance.requestGet(baseurl + 'w_cr.show_credit?p_cur_sid=' + getSid(html));

    var re = new RegExp('(<tr[^>]*onClick="fTableClick(?:[\\s\\S](?!<tr))*' + (prefs.contract || 'td') + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит №' + prefs.contract : 'ни одного кредита'));

    var result = {success: true};
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payTill', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payNext', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /Имя клиента:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    var strakh = getParam(html, null, null, /Информация по страхованию(?:[\s\S]*?<table[^>]*>){1}([\s\S]*?)<\/table>/i);
    if(strakh){
        getParam(strakh, result, 'payTillStrakh', /(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(strakh, result, 'payNextStrakh', /(?:[\s\S]*?<td[^>]*>){14}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }else{
        AnyBalance.trace('Не удалось найти информацию по страхованию');
    }

    AnyBalance.setResult(result);
    
}
