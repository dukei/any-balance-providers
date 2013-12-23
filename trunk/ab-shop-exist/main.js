/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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

function parseDateMy(str){
    var val;
    if(/Завтра/i.test(str)){
        var dt = new Date();
	val = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
    }else if(/Сегодня/i.test(str)){
        var dt = new Date();
	val = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    }else{
        return parseDate(str);
    }
    AnyBalance.trace("Parsed " + val + " from " + str);
    return val && val.getTime();
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.exist.ru/Profile/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx', g_headers);

    if(prefs.num && /^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние цифры номера заказа или не вводите ничего, чтобы получить информацию по последнему заказу');

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
	//Безналичный счёт
    getParam(html, result, 'balancebez', /Безналичный счёт:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'code', /&laquo;код клиента&raquo;\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /&laquo;код клиента&raquo;\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'debt', /Долг по заказам:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'card', /Счёт[^>]*карты:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'carddebt', /Долг по счёту кредитной карты:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('ordernum', 'ordersum', 'orderdesc', 'orderstatus', 'orderexpect')){
        html = AnyBalance.requestGet(baseurl+'Orders/default.aspx', g_headers); 
        var num = prefs.num || '\\d+';
        var re = new RegExp("<tr[^>]*>(?:[\\s\\S](?!</tr>))*?getOrder\\('[^']*\\d*" + num + "'[\\s\\S]*?</tr>", "i");
        var tr = getParam(html, null, null, re);
        if(!tr)
            AnyBalance.trace(prefs.num ? 'Не найдено активного заказа с последними цифрами ' + prefs.num : 'Не найдено ни одного активного заказа');
        else{
           getParam(tr, result, 'ordernum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
           getParam(tr, result, 'ordersum', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
           getParam(tr, result, 'orderstatus', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
           getParam(tr, result, 'orderexpect', /(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMy);
           getParam(tr, result, 'orderdesc', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
