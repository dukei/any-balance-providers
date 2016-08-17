/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    // Mobile
    //'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
    // Desktop
    'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36',
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
        loginPassIncorrect: 'Некорректный номер или пароль',
        checkNumIncorrect: 'Некорректный проверочный код',
        htmlChanged: 'Не удалось зайти в личный кабинет. Сайт изменен?'
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
        var error = AB.getJson(json);
        if ((error.type == 'error') && (error.code == 'S100003')) {
            throw new AnyBalance.Error(errors.loginPassIncorrect, false, true);
        }
        if ((error.type == 'validate') && error.params && error.params.checkNum) {
            throw new AnyBalance.Error(errors.checkNumIncorrect);
        }
        throw new AnyBalance.Error(errors.auth);
    }

    var html = AnyBalance.requestGet(baseurl + 'mybill/init', g_headers);
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error(errors.http);
    }
    
    if (!/id="inetLogoutId"/i.test(html)) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error(errors.htmlChanged);
    }

    var result = {
        success: true
    };
    
    function select(html, selector) {
        selector = selector.split('.');
        var tag = selector[0] || '[a-z1-6]+';
        var className = selector[1];
        return AB.getElement(html, RegExp('<' + tag + '\\s[^>]*' + (className ? 'class="[^"]*\\b' + className + '\\b[^"]*"' : '') + '[^>]*>', 'i'));
    }
    
    var userInfo = select(html, 'div.myeCare');

    AB.getParam(userInfo, result, 'fio', /!\s*([^,<]+)/);
    AB.getParam(userInfo, result, 'phone', /\d{7,12}/);
    AB.getParam(select(html, 'div.myBillDes'), result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(select(select(html, 'div.primaryOffering'), 'p.des'), result, 'offering', null, AB.replaceTagsAndSpaces);
    AB.getParam(select(html, 'div.billInformation'), result, 'acdate', /<dd>\s*([0-9:\s-]{19})/i, AB.replaceTagsAndSpaces, AB.parseDate);

    if (AnyBalance.isAvailable(['gprs', 'gprstotal'])) {
        var divTabsGPRS = AB.getElement(select(html, 'div.dscharTabCon'), /<div\s[^>]*?id="tabs-12"/i);
        var tbody = AB.getElement(divTabsGPRS, /<tbody[^>]*?class="[^"]*?\btc\b/i);
        var rows = AB.getElements(tbody, /<tr/ig) || [];
        
        for (var i = 0; i < rows.length; ++i) {
            var gprsInfo = rows[i];
            var unitMatch = /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i.exec(gprsInfo);
            var unit = unitMatch && unitMatch[1] || 'KB';
            var valueMatch = /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i.exec(gprsInfo);
            var gprsValue = valueMatch && valueMatch[1] || '';
            AB.sumParam(gprsValue, result, 'gprs', /([^\/<]*)/i, [AB.replaceTagsAndSpaces, /$/, unit], parseTraffic, aggregate_sum);
            AB.sumParam(gprsValue, result, 'gprstotal', /\/([^<]*)/i, [AB.replaceTagsAndSpaces, /$/, unit], parseTraffic, aggregate_sum);
        }
    }
    
    AnyBalance.setResult(result);
}