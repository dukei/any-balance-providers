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

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://lc.divo.ru/';

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl, {
        page:'http://divo.ru/service/internet/234.html',
        AccountId:prefs.login,
        Password:prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/id="Exit"/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<h1>Ошибка авторизации<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'balance', /Состояние счета:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestPost(baseurl, {
            ScriptManager:'ScriptManager|DetailLast3Month',
            CurrentAction:'Detail',
            CurrentActionAttributes:'3:web',
            __EVENTTARGET:'DetailLast3Month',
            __EVENTARGUMENT:'',
            __VIEWSTATE:getViewState(html),
            __EVENTVALIDATION:getEventValidation(html),
            __ASYNCPOST:true,
            '':''
        }, addHeaders({Referer: baseurl, 'X-MicrosoftAjax':'Delta=true', 'X-Requested-With':'XMLHttpRequest'}));
        
        getParam(html, result, 'trafficIn', /Входящий трафик:([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /Исходящий трафик:([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    html = AnyBalance.requestPost(baseurl, {
        ScriptManager:'ScriptManager|TarifHistory',
        CurrentAction:'Default',
        CurrentActionAttributes:'',
        __EVENTTARGET:'TarifHistory',
        __EVENTARGUMENT:'',
        __VIEWSTATE:getViewState(html),
        __EVENTVALIDATION:getEventValidation(html),
        __ASYNCPOST:true,
        '':''
    }, addHeaders({Referer: baseurl, 'X-MicrosoftAjax':'Delta=true', 'X-Requested-With':'XMLHttpRequest'}));
    
    var table = getParam(html, null, null, /<th[^>]*>\s*Тариф([\s\S]*?)<\/table>/i);

    sumParam(table, result, '__tariff', /<tr[^>]*>(?:(?:[\s\S](?!<\/tr>))*?<td[^>]*>){2}((?:[\s\S](?!<\/tr>))*?)<\/td>(?:[\s\S](?!<\/tr>))*?<td[^>]*>Текущий<\/td>\s*<\/tr>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
