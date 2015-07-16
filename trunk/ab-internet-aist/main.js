/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/) || getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

g_region = {
    smr: 'Самара',
    tlt: 'Тольятти'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var region = g_region[prefs.region] ? prefs.region : 'tlt';
    AnyBalance.trace('Используется регион: ' + region);
    var baseurl = "https://" + region + ".class.avtograd.ru/";
    var loginpart = "login/default.aspx?back_url=%2fUser%2fDefault.aspx";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + loginpart, g_headers);
    var vs = getViewState(html);
    var ev = getEventValidation(html);

    if(!vs) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    //Теперь, когда секретный параметр есть, можно попытаться войти
    html = AnyBalance.requestPost(baseurl + loginpart, {
        'ctl00$ScriptManager1':'ctl00$cpContent$updLogin|ctl00$cpContent$btnLogin',
        'ctl00_ScriptManager1_HiddenField':'',
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:vs,
        __EVENTVALIDATION:ev,
        ctl00$cpContent$tbUserLogin:prefs.login,
        ctl00$cpContent$tbUserPass:prefs.password,
        __ASYNCPOST:true,
        ctl00$cpContent$btnLogin:'Войти'
    }, addHeaders({Referer: baseurl + loginpart, 'X-MicrosoftAjax':'Delta=true','X-Requested-With':'XMLHttpRequest'})); 

    if(!/pageRedirect\|\|\/User\/Default.aspx/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<span[^>]+class="errorMsg"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'User\/Default.aspx', g_headers);

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'fio', /<span[^>]+lblUserName"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'line', /<span[^>]+lblCardNumber"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'logins', /<span[^>]+ConcurentLoginsLabel"[^>]*class="infoTableStateEnabled"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'staticip', /<a[^>]+hlStaticIP"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<a[^>]+lbtnRegistration"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /<span[^>]+lblRegistrationExpiration"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'nexttar', /<a[^>]+lbtnNextTarifPlan"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'email', /<a[^>]+lbtnEmail"[^>]*>((?:[\s\S](?!<\/a))*?@[\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<span[^>]+lblMoney"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'filter', /<a[^>]+lbtnFilter"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'parent', /<a[^>]+ctl00_cpContent_LinkParentControl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /<span[^>]+lblState"[^>]*>([\s\S]*?)<\/span>\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
