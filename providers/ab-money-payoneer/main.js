/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Connection': 'keep-alive',
    'User-Agent': 'Payoneer/5.0 (XT1092; Android 6.0)',
    'Accept-Charset': 'UTF-8',
    'X-PX-AUTHORIZATION': '2',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://myaccount.payoneer.com/';
    var apiUrl = 'https://loginapi.payoneer.com/';
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var deviceId = getDeviceId();

    // Массив с сообщениями
    var res = AnyBalance.requestGet(apiUrl + 'api/v1/assets?locale=en', AB.addHeaders({
        'Accept': 'application/json',
    }));
    var messages = JSON.parse(res);

    AnyBalance.trace('Регистрируем устройство');
    AnyBalance.requestPost(apiUrl + 'api/v1/devices', JSON.stringify({
        "DeviceId": deviceId,
        "DeviceName": "XT1092",
        "DeviceInfo": {
            "DeviceType": "XT1092",
            "OSType": 1,
            "OSVersion": "6.0",
            "DeviceLanguage": "ru-RU",
            "DeviceTime": (new Date()).toISOString(),
            "DeviceCategory": 2,
            "AppVersion": "5.0"
        }
    }), AB.addHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }));

    res = AnyBalance.requestPost(apiUrl + 'api/v1/mobile/login', JSON.stringify({
        "Username": prefs.login,
        "Password": prefs.password,
        "DeviceId": deviceId,
        "DeviceName": "XT1092",
        "DeviceInfo": {
            "DeviceType": "XT1092",
            "OSType": 1,
            "OSVersion": "6.0",
            "DeviceLanguage": "ru-RU",
            "DeviceTime": (new Date()).toISOString(),
            "DeviceCategory": 2,
            "AppVersion": "5.0"
        }
    }), AB.addHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }));
    var json = JSON.parse(res);

    if (json.NeedToChangePassword) {
        AnyBalance.trace('Payoneer просит сменить пароль');
        throw new AnyBalance.Error('Payoneer просит сменить пароль. Пожалуйста, зайдите в личный кабинет через браузер и смените пароль.', null, true);
    }

    if (json.Errors) {
        var errors = [],
            fatal = false;
        for (var field in json.Errors) {
            var errorName = json.Errors[field];
            if (errorName.indexOf('Username.') === 0 || errorName.indexOf('WrongDetails') !== -1) {
                fatal = true;
            }
            if (errorName in messages.resources) {
                errors.push(messages.resources[errorName]);
            } else {
                errors.push(field+': '+errorName);
            }
        }

        if (errors.length) {
            throw new AnyBalance.Error(errors.join('; '), null, fatal);
        } else {
            throw new AnyBalance.Error('Проблемы на стороне сайта: неизвестная ошибка, попробуйте ещё раз.', null, fatal);
        }
    }

    AnyBalance.trace('Авторизация пройдена');

    res = AnyBalance.requestGet(baseurl + 'gw-balance/API/Balances', AB.addHeaders({
        'Authorization': 'Bearer '+json.TokenInfo.AccessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }));
    json = JSON.parse(res);

    var balance = null;
    for (var i in json) {
        var item = json[i];
        if (item.Status === 1 && item.BalanceType === 2) {
            balance = item;
            break;
        }
    }

    if (!balance) {
        throw new AnyBalance.Error('Не удалось найти активные балансы.');
    }

    var result = {success: true};
    getParam(item.MaskedCardnumber, result, '__tariff', null, replaceTagsAndSpaces);
    getParam(item.Balance, result, 'balance', null, null, parseBalance);

    AnyBalance.setResult(result);
}

function getDeviceId() {
    var g_device_id;
    if (!g_device_id) {
        g_device_id = AnyBalance.getData('device_id');
    }

    if (!g_device_id) {
        var allowedChars = 'abcdef1234567890';
        var result = "";

        for(var i=0; i<16; ++i) {
            result += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
        }

        g_device_id = result;
        AnyBalance.setData('device_id', result);
        AnyBalance.saveData();
    }

    return g_device_id;
}
