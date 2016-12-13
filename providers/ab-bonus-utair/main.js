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

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'signin', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + 'signin', {
        username:prefs.login,
        password:prefs.password
    }, AB.addHeaders({
        Referer: baseurl + 'signin'
    }));

    if(!/signout/i.test(html)){
        var error = getParam(AnyBalance.getLastUrl(), /message=([^&]*)/i, null, decodeURIComponent);
        if(error)
        	throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    if(/verify\/mail/i.test(AnyBalance.getLastUrl())){
    	AnyBalance.trace('Потребовалось подтвердить емейл');
    	throw new AnyBalance.Error('Utair требует подтвердить почтовый ящик. Зайдите в кабинет https://status.utair.ru/ через браузер и подтвердите е-мейл, затем обновите провайдер ещё раз.');
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
