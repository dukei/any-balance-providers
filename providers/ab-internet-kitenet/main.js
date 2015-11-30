/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
    
    var baseurl = "http://my.rusat.com/cgi-bin/clients/";
    AnyBalance.setDefaultCharset('utf-8');
    
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    AnyBalance.sleep(3000);
    
    html = AnyBalance.requestPost(baseurl + 'login', {
        login: prefs.login,
        password: prefs.password,
        action: 'validate',
        submit:'Вход',
    }, addHeaders({Referer: baseurl + 'login'}));

    if (!/logout/i.test(html)) {
        var error = getParam(html, null, null, /Ошибка!([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
        
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};
    
    getParam(html, result, 'id', /лицевой счет([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'payment', /Рекомендуемый платеж:([\s\S]*?)<\/tr/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}