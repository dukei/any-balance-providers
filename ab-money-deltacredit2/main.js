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


function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/) || getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://info.deltacredit.ru/webby/';

    var html = AnyBalance.requestGet(baseurl, g_headers);

    var vs = getViewState(html);
    var ev = getEventValidation(html);

    html = AnyBalance.requestPost(baseurl + 'clogin.aspx', {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:vs,
        __EVENTVALIDATION:ev,
        ctl00$MainContent$WebbyLogin$UserName:prefs.login,
        ctl00$MainContent$WebbyLogin$Password:prefs.password,
        ctl00$MainContent$WebbyLogin$LoginButton:'Войти'
    }, g_headers);

    if(!/Logout.aspx/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="loginError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
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

function fetchAccount(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    if(/<a[^>]+href="AccList.aspx"/.test(html))
        html = AnyBalance.requestGet(baseurl + 'AccList.aspx');

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.contract || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var result = {success: true};

    var re = new RegExp('(<tr[^>]*id=["\']?par_(?:[\\s\\S](?!<tr))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?</tr>)', 'i');

    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'счет № ' + prefs.contract : 'ни одного счета'));
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<span[^>]+id="ctl00_FIOLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(/<a[^>]+href="CreditList.aspx"/.test(html))
        html = AnyBalance.requestGet(baseurl + 'CreditList.aspx');

    var re = new RegExp('(<tr[^>]*id=["\']?par_(?:[\\s\\S](?!<tr))*' + (prefs.contract || 'td') + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит №' + prefs.contract : 'ни одного кредита'));

    var result = {success: true};
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payTill', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payNext', /(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<span[^>]+id="ctl00_FIOLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
    
}
