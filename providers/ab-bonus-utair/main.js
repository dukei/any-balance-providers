/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
**/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = "https://status.utair.ru/";

    AB.checkEmpty(prefs.login, 'Введите номер телефона!');
    AB.checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номер телефона без пробелов и разделителей, например, 9261234567!');

    var html = AnyBalance.requestGet(baseurl + 'signin', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var data = getJsonObject(html, /window._sharedData\s*=/);
    if(!data || !data.token){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + 'signin', {
        username:prefs.login,
        token:data.token
    }, AB.addHeaders({
        Referer: baseurl + 'signin',
        'X-Requested-With': 'XMLHttpRequest'
    }));

    var json = getJson(html);
    if(!/confirm/i.test(json.redirect_link)){
    	var error = json.error_message;
    	if(error)
    		throw new AnyBalance.Error(error, null, /not found/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось авторизоваться. Сайт изменен?');
    }

    var url = json.redirect_link.replace(/http:/i, 'https:');

    html = AnyBalance.requestGet(url, g_headers);
    var message = getElement(html, /<div[^>]+lead/i, replaceTagsAndSpaces);
    var code = AnyBalance.retrieveCode(message || 'Пожалуйста, введите код из СМС для входа в личный кабинет UTair', null, {inputType: 'number', time: 180000});

    html = AnyBalance.requestPost(url, {
        code:code,
        token:data.token
    }, AB.addHeaders({
        Referer: baseurl + 'signin',
        'X-Requested-With': 'XMLHttpRequest'
    }));

    if(AnyBalance.getLastUrl() != baseurl){
    	if(/confirm/i.test(AnyBalance.getLastUrl()))
        	throw new AnyBalance.Error('Неверно введен код!');
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'cardnum', /<text[^>]+id="card-number"[^>]*>([\s\S]*?)<\/text>/i, replaceTagsAndSpaces);
    getParam(html, result, 'fio', /<a[^>]+username[^>]*>([\s\S]*?)<\/a>/i, [replaceTagsAndSpaces, /:/, '']);
    getParam(html, result, 'redemptionMiles', /<span[^>]+transaction-history[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nextExpDate', /Дата аннулирования миль:([^<]*)/i, replaceTagsAndSpaces, AB.parseDate);
    getParam(html, result, '__tariff', /<text[^>]+id="current-status"[^>]*>([\s\S]*?)<\/text>/i, replaceTagsAndSpaces);
    getParam(html, result, 'qualifyingMiles', /<text[^>]+id="progress-miles"[^>]*>([\s\S]*?)<\/text>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
