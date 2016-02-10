/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет ФормулаСвязи

Сайт оператора: http://iformula.ru
Личный кабинет: https://stats.iformula.ru/
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences(),
        baseurl = 'https://stats.iformula.ru/';

    moment.lang('ru');

    var html = AnyBalance.requestGet(baseurl);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    if (!isLoggedIn(html)) {
        var params = {
            'user': prefs.login,
            'pass': prefs.password,
            'uri': '',
            'AuthSubmit': 'войти в кабинет'
        };

        html = AnyBalance.requestPost(
            baseurl + 'login',
            params,
            addHeaders({'Referer': baseurl + 'login'})
        );

        if (!isLoggedIn(html)) {
            var error = getParam(html, null, null, /<div class="[^"]*alert-danger[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            if (error) {
                throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
            }
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    }

    var result = {success: true};

    getParam(html, result, 'fio', getRegEx('Клиент'), replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', getRegEx('Договор'), replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', getRegEx('Баланс счета'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'iptv_id', getRegEx('Идентификатор IPTV'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'address', getRegEx('Адрес'), replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'login', getRegEx('Логин'), replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<h3>[\s\S]*?тариф([\s\S]+?)<span[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'price', /<h3>[\s\S]*?тариф[\s\S]*?<span[^>]*>([\s\S]+?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function isLoggedIn(html) {
    return /\/logout/i.test(html);
}

function getRegEx(search) {
    return new RegExp(search + '[\\s\\S]*?<td[^>]*>([\\s\\S]+?)</td>', 'i');
}
