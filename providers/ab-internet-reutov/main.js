/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для подмосковного интернет-провайдера Reutov.ru (г. Реутов)

Сайт оператора: http://reutov.ru
Личный кабинет: https://www.reutov.ru/cabinet/
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
    
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://my.reutov.ru";
    
    var loginEnc = encodeURIComponent(prefs.login);
    
    var html = AnyBalance.requestGet(baseurl + '/ws/auth/prepare-login/?login=' + loginEnc, AB.addHeaders({ 'X-Requested-With': 'XMLHttpRequest'}));
    
    if (!html || (AnyBalance.getLastStatusCode() >= 400)) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var jsonPL = AB.getJson(html);
    
    if (jsonPL.header.error_code != 0) {
        AnyBalance.trace(jsonPL.header.error_message);
        throw new AnyBalance.Error(jsonPL.header.error_message || 'Ошибка авторизации', false, jsonPL.header.error_code == 1002);
    }
    
    var cnonce = Math.floor(Math.random()*1000000000);
    var digest = MD5(MD5(jsonPL.data.login + ':' + jsonPL.data.realm + ':' + prefs.password) + ':' + jsonPL.data.nonce + ':' + cnonce.toString());
    
    html = AnyBalance.requestGet(baseurl + '/ws/auth/login/?login=' + loginEnc + '&nonce=' + jsonPL.data.nonce + '&cnonce=' + cnonce + '&digest=' + digest + '&status=regular', AB.addHeaders({ 'X-Requested-With': 'XMLHttpRequest'}));
    
    var jsonLogin = AB.getJson(html);
    
    if (jsonLogin.header.error_code != 0) {
        AnyBalance.trace(jsonLogin.header.error_message);
        throw new AnyBalance.Error(jsonLogin.header.error_message || 'Ошибка авторизации', false, jsonPL.header.error_code == 1002);
    }

    html = AnyBalance.requestGet(baseurl + '/statistics/internet', g_headers);
    
    function select(html, selector) {
        selector = selector.split('.');
        var tag = selector[0] || '[a-z1-6]+';
        var className = selector[1];
        return AB.getElement(html, RegExp('<' + tag + '\\s[^>]*' + (className ? 'class="[^"]*\\b' + className + '\\b[^"]*"' : '') + '[^>]*>', 'i'));
    }
    
    var result = {success: true};
    
    var htmlSideUser = select(html, 'div.side-user');
    
    if (!htmlSideUser) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    AB.getParam(select(htmlSideUser, 'a.su-name'), result, 'fio', null, AB.replaceTagsAndSpaces);
    AB.getParam(select(htmlSideUser, 'span.su-statetitle'), result, 'status', null, AB.replaceTagsAndSpaces);
    AB.getParam(select(htmlSideUser, 'td.user-info-balance'), result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(select(htmlSideUser, 'td.su-price'), result, 'abon', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(select(htmlSideUser, 'td.su-next_abon'), result, 'period_end', null, AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(select(htmlSideUser, 'td.su-tp_name'), result, '__tariff', null, AB.replaceTagsAndSpaces);
    
    if (AnyBalance.isAvailable('trafficAbon', 'trafficExtra')) {
        var statHtml = select(select(html, 'div.statistics'), 'p.lead');
        AB.getParam(statHtml, result, 'trafficAbon', /Tрафик,\s+включенный\s+в\s+абонентскую\s+плату\s*:?\s*<b[^>]*>([^<]+<[^>]*>[^<]+)/i, AB.replaceTagsAndSpaces, AB.parseTraffic);
        AB.getParam(statHtml, result, 'trafficExtra', /Трафик,\s+не\s+включенный\s+в\s+абонентскую\s+плату\s*:?\s*<b[^>]*>([^<]+<[^>]*>[^<]+)/i, AB.replaceTagsAndSpaces, AB.parseTraffic);
    }
    
    AnyBalance.setResult(result);
}