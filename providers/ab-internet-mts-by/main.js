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

function phoneNumberFormat(num) {
    var m = /^(?:\+?375)?(\d\d)(\d{3})(\d\d)(\d\d)$/.exec(num);
    return m ? '+375 (' + m[1] + ') ' + m[2] + ' ' + m[3] + ' ' + m[4] : '';
}

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://internet.mts.by/';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var login = phoneNumberFormat(prefs.login);
    checkEmpty(login, 'Введите корректный логин!');

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() >= 400) {
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var inputParams = {
        phone_number: login,
        password: prefs.password
    };
    var params = AB.createFormParams(html, function (params, str, name, value) {
        return inputParams[name] || value;
    });

    html = AnyBalance.requestPost(baseurl + 'session', params, addHeaders({
        Referer: baseurl
    }));
    
    var fio = AB.getElement(html, /<div[^>]*?class="(?=[^"]*?\buser\b)(?=[^"]*?\bname\b)/i, replaceTagsAndSpaces);
	
    if (!fio) {
        var error = AB.getElement(html, /<div[^>]+?class="[^"]*?flash-error/i, replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    
    getParam(login, result, 'number');
    
    function getValue(name, title, parseFunc) {
        if (AnyBalance.isAvailable(name)) {
            var li = AB.getElement(html, RegExp('<li[^>]*?info-box[^>]*>(?=\\s*<div[^>]*?box-heading[^>]*>\\s*' + title + ')', 'i'));
            getParam(AB.getElement(li, /<div[^>]*?user-(?:info|balance)/i, replaceTagsAndSpaces, parseFunc), result, name);
        }
    }
    
    getValue('fio', 'Пользователь');
    getValue('balance', 'Баланс', parseBalance);
    getValue('__tariff', 'Тарифный план');
    getValue('status', 'Статус');
    
    var tableservices = AB.getElement(html, /<table[^>]*?class="[^"]*?services-info/i);
    var tbody = AB.getElement(tableservices, /<tbody/i);
    
    getParam(tbody, result, 'traffic',/<tr[^>]*>(?:[\s\S]*?<td[^>]*>){3}\s*<strong[^>]*>([^<]+)/i, replaceTagsAndSpaces, AB.parseBalance);
    getParam(tbody, result, 'next_topup', /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseDateWord);

    AnyBalance.setResult(result);
}