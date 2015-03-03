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

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://telincom.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var html = AnyBalance.requestPost(baseurl + 'personal/', {
        login: prefs.login,
        password: prefs.password,
        submit: 'Войти'
    });

    if (!/logout/i.test(html)) {
        var error = getParam(html, null, null, /<div[^>]+class="error-message"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error, null, /Логин или пароль не верен/i.test(error));
        
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /balanse(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'credit', /Кредит:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'status', /Статус Интернета:[\S\s]*?<td[^>]*>([\S\s]*?)(?:<a[^>]*>|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /лицевой счет(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /data-name="Интернет"[^>]+data-tarif-name="([^>]*?)"/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'personal/traffic.php');
        getParam(html, result, 'trafficIn', /Всего за период(?:[\s\S]*?<td[^>]*>)([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /Всего за период(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    }
    
    AnyBalance.setResult(result);
}