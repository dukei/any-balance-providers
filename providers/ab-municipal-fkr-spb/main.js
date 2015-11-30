/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://fkr-spb.ru';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + '/user', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    var formBuildID = getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]+value="([\s\S]*?)"[^>]*>/i);
    html = AnyBalance.requestPost(baseurl + '/user', {
        name: prefs.login,
        pass: prefs.password,
        form_id: 'user_login',
        op: 'Войти',
        form_build_id: formBuildID,
        'Remember': 'false'
    }, addHeaders({Referer: baseurl}));

    if (!/\/user\/\d+\/edit/i.test(html)) {
        var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>([\s\S]*?)\(.*?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error, null, /Имя пользователя или пароль введены неверно/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};

    var userID = getParam(html, null, null, /<a href="\/user\/(\d+)\/[^>]*>/i, null, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + '/user/' + userID + '/edit');
    getParam(html, result, 'fio', /id="edit-field-fio-und-0-value"[^>]+value="([\s\S]*?)"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);

    var json = requestGetJson('/rest.php?method=flats', baseurl);

    if (!isArray(json) || json.length == 0)
        throw new AnyBalance.Error('Не удалось найти информацию по квартире, сайт изменен?');

    getParam(json[0].fullAddress, result, 'adress', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json[0].sqrFull + '', result, 'flatArea', null, null, parseBalance);
    getParam(json[0].kadNum, result, 'flatKadNum', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json[0].house.kadNum, result, 'houseKadNum', null, replaceTagsAndSpaces, html_entity_decode);

    json = requestGetJson('/rest.php?method=flat&id=' + json[0].id, baseurl);

    getParam(json.house.houseTotals.collectPercent, result, 'contributions');
    getParam(json.saldo + '', result, 'balance', null, null, parseBalance);

    AnyBalance.setResult(result);
}

function requestGetJson(href, baseurl) {
    return getJson(AnyBalance.requestGet(baseurl + href));
}