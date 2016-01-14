/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'close',
    'Origin': 'https://www.s7.ru',
    'Referer': 'https://www.s7.ru/',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900F Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.93 Mobile Safari/537.36'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = 'https://www.s7.ru/dotCMS/priority/';
    
    var loginJson = AnyBalance.requestPost(baseurl + 'ajaxLogin', {
        dispatch: 'login',
        username: prefs.login,
        password: prefs.password
    }, g_headers);
    
    if (!loginJson || (AnyBalance.getLastStatusCode() >= 400)) {
        AnyBalance.trace(loginJson);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var login = AB.getJson(loginJson);
    if (login.status == 'error') {
        throw new AnyBalance.Error(login.errors && login.errors[0] || 'Ошибка автризации.', false, true);
    }
    
    var userDataJson = AnyBalance.requestGet(baseurl + 'ajaxProfileService?dispatch=getUserInfo&_=' + Date.now(), g_headers);
    
    if (!userDataJson || (AnyBalance.getLastStatusCode() >= 400)) {
        AnyBalance.trace(userDataJson);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var userData = AB.getJson(userDataJson);
    
    if (!userData.c) {
        AnyBalance.trace(userDataJson);
        throw new AnyBalance.Error('Не удалось получить данные.');
    }

    var cardLevels = {
        CLASSIC: 'Классическая',
        SILVER: 'Серебряная',
        GOLD: 'Золотая',
        PLATINUM: 'Платиновая'
    };

    var result = {
        success: true,
        balance: userData.c.milesBalance,
        cardnum: userData.c.cardNumber,
        qmiles: userData.c.qMiles,
        flights: userData.c.qFlights,
        userName: userData.c.firstName + ' ' + userData.c.lastName,
        type: cardLevels[userData.c.cardLevel] || userData.c.cardLevel
    };

    AnyBalance.setResult(result);
}
