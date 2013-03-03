/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Altel - корпоративный портал.

Сайт оператора: http://www.altel.kz/
Личный кабинет: https://cabinet.3g.kz:8443
*/

var g_headers = {
	'Origin': 'https://cabinet.altel4g.kz',
	'Referer': 'https://cabinet.altel4g.kz/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://cabinet.altel4g.kz/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl, {
        form_login:prefs.login,
        form_pass:prefs.password,
        x:81,
        y:18
    }, g_headers);

    if(!/logout=1/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="error"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'fio', /<h5[^>]*>([\s\S]*?)(?:, (?:добро пожаловать|қош келдіңіз))?<\/h5>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /(?:Ваш номер|Сіздің нөміріңіз):([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /(?:Подключен тариф|Қосылған тариф):[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /(?:Срок действия до:|Әрекет теу мерзімі)[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'traffic_left', /(?:Всего осталось трафика|Қалған трафик):([\s\S]*?)<\/h6>/i, replaceTagsAndSpaces, parseTrafficGb);

    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + 'account');
        getParam(html, result, 'balance', /<div[^>]+class="number"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }
        
    AnyBalance.setResult(result);
}
