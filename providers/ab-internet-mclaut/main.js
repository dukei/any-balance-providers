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

    var baseurl = "https://cherkassy.mclaut.com/";

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var html = AnyBalance.requestPost(baseurl + 'index.php', {
        query: 'ajax',
        app: 'frontend',
        module: 'user',
        action: 'clientLogIn',
        login: prefs.login,
        pass: prefs.password,
        city: 1,
        lang: 'ru'
    }, addHeaders({ Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest' }));

    if(!html)
        throw new AnyBalance.Error('Неверный логин или пароль или сайт изменен.', null, true);
    
    if(html != '1')
        throw new AnyBalance.Error('Неизвестная ошибка. Сайт изменен?');

    html = AnyBalance.requestGet(baseurl, g_headers);

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /403 Forbidden/i);
        if(error)
            throw new AnyBalance.Error('Личный кабинет доступен только из сети McLaut. Установите WiFi соединение с домашним роутером.');
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<td[^>]*>\s*Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){var val = parseBalance(str); return val && Math.round(val*100)/100;});
    getParam(html, result, 'status', /<td[^>]*>\s*Активен[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<td[^>]*>\s*ФИО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /<td[^>]*>\s*Номер лицевого счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<td[^>]*>\s*Логин[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    


    AnyBalance.setResult(result);
}
