/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Altel - корпоративный портал.

Сайт оператора: http://www.altel.kz/
Личный кабинет: https://cabinet.3g.kz:8443
*/

var g_headers = {
	'Origin': 'https://cabinet.3g.kz:8443',
	'Referer': 'https://cabinet.3g.kz:8443/work.html',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://cabinet.3g.kz:8443/work.html";
    AnyBalance.setDefaultCharset('windows-1251');

    var product = prefs.product || 'AUTH_DALACOM';

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var form = getParam(html, null, null, /<form[^>]+name="mainForm"[^>]*>([\s\S]*?)<\/form>/i);

    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Проблемы на сайте или сайт изменен.');
    
    var params = createFormParams(html, function(params, input, name, value){
        var undef;
        var id = getParam(input, null, null, /id="([^"]*)"/i);
        if(name == 'user_input_timestamp')
            value = new Date().getTime();
        else if(id == 'MODE_FORM')
            value = product;
        else if(name == 'user_submit')
            value = undef;
        else if(name == 'user_input_0')
            value = '_next';
       
        return value;
    });
    
    html = requestPostMultipart(baseurl, params, g_headers);
    var form = getParam(html, null, null, /<form[^>]+name="mainForm"[^>]*>([\s\S]*?)<\/form>/i);

    var params = createFormParams(html, function(params, input, name, value){
        var undef;
        var id = getParam(input, null, null, /id="([^"]*)"/i);
        if(name == 'user_input_timestamp')
            value = new Date().getTime();
        else if(id == 'ASK_MSISDN')
            value = prefs.login;
        else if(id == 'ASK_PWD')
            value = prefs.password;
        else if(name == 'user_submit')
            value = undef;
        else if(name == 'user_input_0')
            value = '_next';
       
        return value;
    });
    
    html = requestPostMultipart(baseurl, params, g_headers);

    if(!/_root\/INFO/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+id="ERR_MSG"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!error)
            error = getParam(html, null, null, /<td[^>]+class="info_error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var sid = getParam(html, null, null, /<input[^>]+name="sid3"[^>]*value="([^"]*)/i);
    if(!sid)
        throw new AnyBalance.Error('Не удалось найти идентификатор сессии. Сайт изменен?');

    html = requestPostMultipart(baseurl, {
        sid3: sid,
        user_input_timestamp: new Date().getTime(),
        user_input_0: '_next',
        user_input_1: 'INFO'
    }, g_headers);

    var result = {success: true};

    getParam(html, result, 'balance', /<td[^>]+id="BALANCE"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<td[^>]+id="NAME"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<td[^>]+id="TPLAN_NAME"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /<td[^>]+id="STATUS"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lastPayDate', /<td[^>]+id="LAST_PAY_DATE"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'lastPay', /<td[^>]+id="LAST_PAY_SUMM"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'phone', /<td[^>]+id="PHONE"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'mins_left', /<td[^>]+id="BALANCE_PRED"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic_left', /<td[^>]+id="TRAFFIC_PACKET_REST"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);

    AnyBalance.setResult(result);
}
