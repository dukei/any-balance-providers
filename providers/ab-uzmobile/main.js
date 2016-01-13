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
    var baseurl = 'https://gsm.uzmobile.uz/ecare/inet/';
    AnyBalance.setDefaultCharset('utf-8');

    var errors = {
        http: 'Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.',
        emptyLogin: 'Введите логин!',
        emptyPass: 'Введите пароль!',
        auth: 'Ошибка авторизации',
        code: 'Некорректный проверочный код',
        changed: 'Не удалось зайти в личный кабинет. Сайт изменен?'
    };


    AB.checkEmpty(prefs.login, errors.emptyLogin);
    AB.checkEmpty(prefs.password, errors.emptyPass);

    var html = AnyBalance.requestGet(baseurl + 'subscriber/loginInit?null', g_headers);

    if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error(errors.http);
    }

    var image = AnyBalance.requestGet('https://gsm.uzmobile.uz/ecare/verifycode?sessionKey=loginCheckNum', g_headers);

    if (!image || AnyBalance.getLastStatusCode() >= 400) {
        throw new AnyBalance.Error(errors.http);
    }

    var code = AnyBalance.retrieveCode('Введите проверочный код', image);

    var inputParams = {
        msisdn: prefs.login,
        password: prefs.password,
        loginType: '0',
        checkNum: code
    };

    var params = AB.createFormParams(html, function (params, str, name, value) {
        return inputParams[name] || value;
    });

    params._eventId = '';
    params.ajaxSource = '';
    params._csrf = 'undefined';
    params.nc = Date.now();

    var json = AnyBalance.requestPost(baseurl + 'subscriber/securityLogin', params, AB.addHeaders({
        Referer: baseurl + 'subscriber/loginInit?null',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://gsm.uzmobile.uz',
        ErrorJson: 'true',
        'Accept-Content': 'text/html;type=ajax'
    }));


    if (AnyBalance.getLastStatusCode() >= 400) {
        throw new AnyBalance.Error(errors.http);
    }

    if (json) {
        var errorMessage = errors.auth;
        var fatal = false;
        try {
            var error = JSON.parse(json);
            if (error.type == 'error') {
                errorMessage = error.message || errorMessage;
                fatal = true;
            }
            if (error.type == 'validate') {
                errorMessage = error.params.checkNum ? errors.code : errorMessage;
            }
        } catch (exc) {
            throw new AnyBalance.Error(errorMessage);
        }
        throw new AnyBalance.Error(errorMessage, false, fatal);
    }

    var html = AnyBalance.requestGet(baseurl + 'mybill/init', g_headers);
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error(errors.http);
    }

    //window.__html = html;

    var matchUserInfo = /myeCare[^>]*>[^<!]{1,180}!\s*([^<,]+),[^<0-9]*(\d{9,13})\s*<input[^>]+?inetLogoutId/i.exec(html);

    if (!matchUserInfo) {
        throw new AnyBalance.Error(errors.changed, false, true);
    }

    var result = {
        success: true,
        fio: matchUserInfo[1],
        phone: matchUserInfo[2]
    };

    AB.getParam(html, result, 'balance', /class=['"][^'"]*myBillDes[^'"]*['"][^>]*>\s*<p\s[^>]*class=['"][^'"]*price[^'"]*["'][^>]*>\$<span\s[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'offering', /class=['"][^'"]*primaryOffering[^'"]*['"][^>]*>[\s\S]{1,500}?<p\s[^>]*class=['"][^'"]*des[^'"]*["'][^>]*>([\s\S]+?)<\/p>/i, AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'gprs', /<!--\s*GPRS\s*-->[\s\S]{1,100}?id="tabs-12"[\S\s]{1,1000}?class="tc"[\S\s]{1,1000}?<td>\s*(\d+\s*\/\s*\d+)/i, AB.replaceTagsAndSpaces, function (value) {
        var left = parseInt(value, 10);
        if (!left) {
            return 0;
        }
        var total = /(\d+)\s*$/.exec(value)[1];
        return (left / 1024).toFixed(2) + ' mb / ' + (total / 1024).toFixed(2) + ' mb';
    });

    AB.getParam(html, result, 'acdate', /class=['"][^'"]*billInformation[^'"]*['"][^>]*>[\s\S]+?<dd>\s*(\d\d-\d\d-\d\d\d\d\s+\d\d:\d\d:\d\d)/i, AB.replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}