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
        var error = getParam(html, null, null, /<div[^>]+class="loginError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
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

    var result = {success: true};

    var credits = getElements(html, /<div[^>]+creditWrap[^>]*>/ig);
    AnyBalance.trace('Найдено ' + credits.length + ' счетов');
    for(var i=0; i < credits.length; ++i){
    	var c = credits[i];
    	var num = getParam(c, null, null, /Номер счета:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    	AnyBalance.trace('Найден счет с номером ' + num);
    	if(!prefs.contract || endsWith(num, prefs.contract)){
    		getParam(num, result, 'accnum');
    		getParam(c, result, 'accname', /Тип (?:кредита|сч[её]та):([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		getParam(c, result, '__tariff', /Тип (?:кредита|сч[её]та):([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		getParam(c, result, 'balance', /Остаток на счете:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    		getParam(c, result, 'status', /Состояние счета:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		getParam(c, result, 'currency', /Валюта:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		break;
    	}
    }

    if(i >= credits.length)
    	throw new AnyBalance.Error(prefs.contract ? 'Не удалось найти счета с номером, оканчивающимся на ' + prefs.contract : 'Не удалось найти ни одного счета');

    getParam(html, result, 'fio', /<span[^>]+id="ctl00_FIOLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(/<a[^>]+href="CreditList.aspx"/.test(html))
        html = AnyBalance.requestGet(baseurl + 'CreditList.aspx');

    var result = {success: true};

    var credits = getElements(html, /<div[^>]+creditWrap[^>]*>/ig);
    AnyBalance.trace('Найдено ' + credits.length + ' кредитов');
    for(var i=0; i < credits.length; ++i){
    	var c = credits[i];
    	var num = getParam(c, null, null, /Номер договора:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    	AnyBalance.trace('Найден кредит с номером ' + num);
    	if(!prefs.contract || endsWith(num, prefs.contract)){
    		getParam(num, result, 'accnum');
    		getParam(c, result, 'accname', /Тип кредита:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		getParam(c, result, '__tariff', /Тип кредита:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		getParam(c, result, 'payTill', /Дата следующего платежа:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
    		getParam(c, result, 'payNext', /Сумма следующего платежа:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    		getParam(c, result, 'balance', /Остаток задолжности:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    		getParam(c, result, 'limit', /Сумма кредита:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    		getParam(c, result, 'pct', /Процентная ставка:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    		getParam(c, result, 'status', /Состояние кредита:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		getParam(c, result, 'date_start', /Дата выдачи:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
    		getParam(c, result, 'till', /Дата окончания:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
    		getParam(c, result, 'currency', /Валюта:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		break;
    	}
    }

    if(i >= credits.length)
    	throw new AnyBalance.Error(prefs.contract ? 'Не удалось найти кредита с номером договора ' + prefs.contract : 'Не удалось найти ни одного кредита');

    getParam(html, result, 'fio', /<span[^>]+id="ctl00_FIOLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
    
}
