/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
**/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = "https://clm.utair.ru/";

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl+'web/utair/login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + 'web/utair-login', JSON.stringify({
        login:prefs.login,
        password:prefs.password
    }), AB.addHeaders({
        'X-Requested-With': 'XMLHttpRequest'
    }));

    var json = getJson(html);

    if(!json.access_token){

        if(json.errors[0]) {
            var field = json.errors[0].field || undefined;
            var errorCode = json.errors[0].code || undefined;
            if(!field || !errorCode)
                throw new AnyBalance.Error("Не удалось найти параметр ошибки. Сайт изменён?");

            var err_html = AnyBalance.requestGet(baseurl+'utair-cwa-theme/locale/ru_RU.json', g_headers); //Получаем список ошибок
            var err_json = getJson(err_html);

            var error = err_json.errors[errorCode] && err_json.errors[errorCode][field] ? err_json.errors[errorCode][field].tmpl : undefined;
            if(error)
                throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?.');
    }

    var result = {success: true};

    var req_headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + json.access_token,
        'Referer': 'https://clm.utair.ru/group/utair'
    };

    if(isAvailable('cardnum')) {
        html = AnyBalance.requestGet(baseurl+'utair-rest/customers?_='+new Date().getTime(),req_headers);
        json = getJson(html);

        AB.getParam(json.cardNo, result, 'cardnum');
    }

    if(isAvailable(['fio', 'redemptionMiles', 'nextExpDate', 'qualifyingMiles'])) {
        html = AnyBalance.requestGet(baseurl+'utair-rest/profileInfo?_='+new Date().getTime(), req_headers);
        json = getJson(html);

        AB.getParam((json.firstName || '') + ' ' + (json.secondName || '') + ' ' + (json.lastName || ' '), result, 'fio');
        AB.getParam(json.redemptionMiles + '', result, 'redemptionMiles', null, null, AB.parseBalance);
        AB.getParam(json.qualifyingMiles + '', result, 'qualifyingMiles', null, null, AB.parseBalance);
        AB.getParam(json.nextExpDate, result, 'nextExpDate', null, null, AB.parseDate);
    }

    AnyBalance.setResult(result);
}
