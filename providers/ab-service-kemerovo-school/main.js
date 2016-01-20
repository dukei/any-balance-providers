/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    // Mobile
    //'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
    // Desktop
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://cabinet.ruobr.ru';
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + '/login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var params = AB.createFormParams(html);
    params.username = prefs.login;
    params.password = prefs.password;

    html = AnyBalance.requestPost(baseurl + '/login', params, AB.addHeaders({Referer: baseurl + '/login'}));

    if (!/logout/i.test(html)) {
        var elemError = AB.getElement(html, /<div[^>]+?class="[^"]*?form_errors/i);
        var error = AB.getParam(elemError, null, null, /<p[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /пользовател|парол/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    var foodParent = AB.getElement(html, /<div[^>]+?class="[^"]*?\bcabinet-section\b[^"]*"[^>]*>(?=\s*<h\d[^>]*>\s*Питание\s*)/i);
    var foodParent = AB.getElement(foodParent, /<div[^>]+?class="[^"]*?\bin-section/i);
    
    if (!foodParent) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найдены данные о питании. Сайт изменен?');
    }
    
    AB.getParam(foodParent, result, 'fio', /<h\d[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    
    function getValue(name, title, parseFunc) {
        AB.getParam(foodParent, result, name, RegExp('left[^>]+>\\s*' + title + '\\s*</span>\\s*<span[^>]*>\\s*([^<]+)', 'i'), AB.replaceTagsAndSpaces, parseFunc);
    }
    
    getValue('num', '№ Лицевого счёта');
    getValue('balance', 'Cостояние счёта', AB.parseBalance);
    getValue('subsidy', 'Субсидия', AB.parseBalance);
    getValue('complex', 'Комплекс по умолчанию');

    AnyBalance.setResult(result);
}