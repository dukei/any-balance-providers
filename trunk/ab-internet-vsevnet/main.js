/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "http://user.vsevnet.ru/";

    var html = AnyBalance.requestGet(baseurl, g_headers);

    var res = AnyBalance.requestPost(baseurl, {
        act: 'login',
    	dogovor: prefs.login,
    	password: prefs.password
    }, {'X-Requested-With': 'XMLHttpRequest', Referer: baseurl});

    var json = getJson(res);

    if(json.login !== 'true')
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?", null, json.login === 'false');

    html = AnyBalance.requestGet(baseurl, g_headers);

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс вашего договора[\s\S]*?<\/span>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agr', /Номер договора[\s\S]*?<\/div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Договор заключен на имя[\s\S]*?<\/div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Текущее состояние[\s\S]*?<\/div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    
    if(isAvailable(['trafficIn', 'trafficOut', '__tariff'])){
        html = AnyBalance.requestGet(baseurl + 'statistics/inet', g_headers);

        getParam(html, result, '__tariff', /Тариф:[\s\S]*?<\/div>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

        var tarifID = getParam(html, null, null, /id="tarif"[\s\S]+?value="([^"]+)/i, replaceTagsAndSpaces, parseBalance);

        AnyBalance.trace('Found tarif with id = ' + tarifID);

        res = AnyBalance.requestPost(baseurl + 'module/statistics/ajax.php', {
            act: 'graph_inet',
            dogovor: prefs.login,
            days: 30,
            datefrom: '',
            dateto: '',
            tarif: tarifID
        }, {'X-Requested-With': 'XMLHttpRequest', Referer: baseurl});

        json = getJson(res);

        getParam(json.sum_in, result, 'trafficIn', null, null, parseBalance);
        getParam(json.sum_out, result, 'trafficOut', null, null, parseBalance);
    }

    if(isAvailable(['charge', 'cost'])){
        html = AnyBalance.requestGet(baseurl + 'services/inet', g_headers);
        getParam(html, result, 'charge', /Тарифные планы[\s\S]+?<tbody>\s*<tr>(?:\s*<td>[\s\S]*?<\/td>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'abon', /Тарифные планы[\s\S]+?<tbody>\s*<tr>(?:\s*<td>[\s\S]*?<\/td>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
