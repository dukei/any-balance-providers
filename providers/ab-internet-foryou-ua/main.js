/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "https://stat.foryou.net.ua/cgi-bin/my.pl";

    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var sessionValue = AB.getParam(html, null, null, /<input[^>]*name=ses\s+value=(\d+)/i),
        password = hex_md5(sessionValue + ' ' + prefs.password),
        loginUrl = baseurl + '?ses=' + sessionValue + '&uu=' + prefs.login + '&pp=' + password;

    html = AnyBalance.requestGet(loginUrl, AB.addHeaders({Referer: loginUrl}));

    if (!/Выход\s*<\/a>/i.test(html)) {
        if (/Неверная авторизация/i.test(html)) {
            throw new AnyBalance.Error('Неправильный логин или пароль!', null, true);
        }

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    AB.getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'balance', /Остаток на счету[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'personal_code', /Персональный платежный код[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
