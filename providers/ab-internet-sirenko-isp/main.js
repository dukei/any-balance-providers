
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
    var baseurl = 'http://stat.dan.net.ua';
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestPost(baseurl + '/main.php', {
        login: prefs.login,
        password: prefs.password,
        auth_login: '1'
    }, AB.addHeaders({
        Referer: baseurl
    }));

    if (!/action=exit/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div[^>]+?class="[^"]*?alert-danger[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    html = AnyBalance.requestGet(baseurl + '/main.php', g_headers);

    var result = { success: true };
    
    AB.getParam(html, result, 'fio', /<td[^>]*>Ф\.И\.О\.:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'contract', /<td[^>]*>Договор:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'userstatus', /<td[^>]*>Статус\s+пользователя:?<\/td\s*>\s*<td[^>]*>([\s\S]+?)<\/td/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, '__tariff', /<td[^>]*>Тариф:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'abon', /<td[^>]*>Абонплата\s+по\s+тарифу:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, ['acurrency', 'abon'], /<td[^>]*>Абонплата\s+по\s+тарифу:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
    AB.getParam(html, result, 'balance', /<td[^>]*>Текущий\sбаланс:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, ['bcurrency', 'balance'], /<td[^>]*>Текущий\sбаланс:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
    AB.getParam(html, result, 'servicestatus', /<td[^>]*>Статус\s+услуги:?<\/td\s*>\s*<td[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    
    AnyBalance.setResult(result);
}
