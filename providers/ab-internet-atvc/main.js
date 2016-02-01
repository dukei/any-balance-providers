/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для провайдера АТК 

Operator site: http://atvc.ru/
Личный кабинет: https://support.atknet.ru/
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

    var baseurl = "https://support.atknet.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!isLoggedIn(html)) {
        var csrf = getParam(html, null, null, /<input[^>]+name=(?:'|")csrfmiddlewaretoken(?:'|")[^>]+value=(?:'|")([^(?:'|")]*)/i, null, html_entity_decode);
        if (!csrf)
            throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

        html = AnyBalance.requestPost(
            baseurl + 'account/login/',
            {
                'csrfmiddlewaretoken': csrf,
                'username': prefs.login,
                'password': prefs.password,
                'next': ''
            },
            addHeaders({Referer: baseurl + 'account/login/?next=/'})
        );

        if (!isLoggedIn(html)) {
            defineError(html);
        }
    }

    html = AnyBalance.requestGet(baseurl + 'internet/' + prefs.login + '/');

    if (!isLoggedIn(html)) {
        defineError(html);
    }

    var result = {success: true};

    getParam(html, result, '__tariff', /Тариф[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licenseFee', /Ежемесячный платёж[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'payment', /К оплате[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'virtual_payment', /Виртуальный платеж[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'status', /Статус[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'login', /Логин[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'mailnumber', /Почтовый ящик[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function isLoggedIn(html) {
    return /\/logout/i.test(html);
}

function defineError(html) {
    var error = getParam(html, null, null, /<div class="alert alert-danger[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if (error) {
        throw new AnyBalance.Error(error, null, true);
    }

    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
}
