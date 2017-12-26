/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':  'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection':       'keep-alive',
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://driver.taxsee.com/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
	html = AnyBalance.requestPost(baseurl + 'login/',  {
        '_csrf': AB.getParam(html, null, null, /input(?:[^>]*)name="_csrf"[^>]*value="([^"]*)/i, AB.replaceTagsAndSpaces),
        'LoginForm[call]':      prefs.login,
        'LoginForm[password]':  prefs.password,
        'login-button': ''
    }, AB.addHeaders({
        Referer: baseurl + 'login/',
        Origin: baseurl
    }));

    if (!/\/logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div class="error-summary"(?:[^>]*>)([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, null, /Неверно/i.test(error));
        }

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, '__tariff', /input(?:[^>]*)id="profileform-fio"[^>]*value="([^"]*)/i, AB.replaceTagsAndSpaces);
    AB.getParam(result.__tariff, result, 'fio');
    AB.getParam(html, result, 'balance', /input(?:[^>]*)id="profileform-saldo"[^>]*value="([^"]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AnyBalance.setResult(result);
}