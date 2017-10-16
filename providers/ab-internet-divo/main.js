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
    var baseurl = 'https://lc.divo.ru/';

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'Account/SignIn', {
        page:'https://www.divo.ru/%D0%BE%D1%88%D0%B8%D0%B1%D0%BA%D0%B0-%D0%B0%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D0%B8/',
        AccountId:prefs.login,
        Password:prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/SignOut/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<h\d>Ошибка авторизации<\/h\d>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'balance', /Состояние счета:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счет:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тарифные планы:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'History/Last3MonthsSessions', addHeaders({Referer: baseurl}));

        var tbl = getElement(html, /<table[^>]+color-table/i);
        var trs = getElements(tbl || '', [/<tr/g, new RegExp(getFormattedDate({format: 'MM\\.YYYY'}))]);
        for(var i=0; i<trs.length; ++i){
        	sumParam(html, result, 'trafficIn', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent, aggregate_sum);
        	sumParam(html, result, 'trafficOut', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent, aggregate_sum);
        }
        if(result.trafficIn)
        	result.trafficIn = parseTrafficGb(result.trafficIn + ' bytes');
        if(result.trafficOut)
        	result.trafficOut = parseTrafficGb(result.trafficOut + ' bytes');
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
