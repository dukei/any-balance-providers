/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию об остатке на счету для магазина автозапчастей exist

Operator site: http://exist.ru
Личный кабинет: http://exist.ru
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/) || getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.exist.ru/Profile/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx', g_headers);

    //Находим секретный параметр
    var viewstate = getViewState(html);
    var eventvalidation = getEventValidation(html);
    if(!viewstate) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    //Теперь, когда секретный параметр есть, можно попытаться войти
    html = AnyBalance.requestPost(baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx', {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:viewstate,
        __EVENTVALIDATION:eventvalidation,
        ctl00$ctl00$b$b$custLogin$txtLogin:prefs.login,
        ctl00$ctl00$b$b$custLogin$txtPassword:prefs.password,
        ctl00$ctl00$b$b$custLogin$bnLogin:'Ждите...'
    }, addHeaders({Referer: baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx'})); 

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/\/exit.axd/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<span[^>]+id="lblError"[^>]*>([\s\S]*?)(?:<\/span>|<a[^>]+href=['"]\/howgetpass.aspx)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /Наличный счёт:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'code', /&laquo;код клиента&raquo;\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /&laquo;код клиента&raquo;\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'debt', /Долг по заказам:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'card', /Счёт кредитной карты:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'carddebt', /Долг по счёту кредитной карты:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
