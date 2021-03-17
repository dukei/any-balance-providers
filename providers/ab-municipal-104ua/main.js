/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'okhttp/3.3.0',
    'X-Application-Key': 'd43a63c9302bf27bf53749542c84a39e8769b2d2',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept-Language': 'ru-RU'
};
var baseurl = 'https://mobile.104.ua/billing/api/v2/';

function callApi(cmd, params) {
    if ('string' == typeof params) {
        var html = AnyBalance.requestPost(baseurl + cmd, params, g_headers);
    } else {
        var html = AnyBalance.requestGet(baseurl + cmd, g_headers);
    }
    var json = getJson(html);
    if (json.status_message) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error(json.status_message);
    }
    if (!json.data) return {};
    if (json.data.session_id) g_headers['X-Session-Id'] = json.data.session_id;
    return json.data;
}

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    var id = AnyBalance.getData('X-Session-Id');
    if (id) {
        g_headers['X-Session-Id'] = id;
        AnyBalance.trace('Обнаружена старая сессия. Проверяем');
        try {
            var j = callApi('users/' + prefs.login + '/accounts')[0];
            AnyBalance.trace('Сессия в порядке. Используем её');
        } catch (e) {
            AnyBalance.trace('Сессия испорчена');
            AnyBalance.trace(e.message);
            id = '';
            g_headers['X-Session-Id'] = id;
        }
    }
    if (!id) {
        AnyBalance.trace('Вход с логином и паролем');
        checkEmpty(prefs.login, 'Введите логин!');
        checkEmpty(prefs.password, 'Введите пароль!');

        callApi('users/' + prefs.login + '/sessions?password=' + prefs.password + '&device_id=1', '');
        var j = callApi('users/' + prefs.login + '/accounts')[0];
    }
    var account_no = j.account_no;
    var result = {
        success: true
    };
    result.fio = j.full_name;

    j = callApi('users/' + prefs.login);
    result.balance = -j.saldo;
    result.phone = j.mobile_phone || j.landing_phone || j.main_phone || j.logon_phone;
    result.address = j.full_address;
    result.email = j.email || j.logon_name;
    result.people_count = j.people_count;
    result.eic_code = j.eic_code;
    result.price_main = j.price_main;
    result.ls = j.account_no;
    if (j.last_payment_sum) result.last_payment = j.last_payment_sum.toFixed(2) + ' грн. ' + j.last_payment_created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1');

    j = callApi('accounts/' + account_no + '/delivery');
    result.balance_rasp = -j.saldo_distribution;
    result.price_rasp = j.price_distribution;

    var range = '?created_at_range[start]=' + getFormattedDate({format: 'YYYY-MM-DD',offsetMonth: 6}) + '&created_at_range[end]=' + getFormattedDate('YYYY-MM-DD');
    if (AnyBalance.isAvailable(['meterages', 'meter_no'])) {
        j = callApi('users/' + prefs.login + '/meters/meterages' + range);
        if (j.length > 0) {
            result.meterages = j.map(data => data.value_source + ' ' + data.created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1') + '<br><strong>' + data.value + '(+' + data.delta + ')</strong>').join('<br><br>');
            result.meter_no = j[0].meter_no;
        }
    }
    if (AnyBalance.isAvailable('deliveryPay')) {
        j = callApi('accounts/' + account_no + '/delivery/payments' + range);
        if (j.length > 0) result.deliveryPay = j.map(data => data.value.toFixed(2) + ' грн. ' + data.created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1')).join('<br>');
    }
    if (AnyBalance.isAvailable('gasPay')) {
        j = callApi('users/' + prefs.login + '/payments' + range);
        if (j.length > 0) result.gasPay = j.map(data => data.value.toFixed(2) + ' грн. ' + data.created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1')).join('<br>');
    }

    AnyBalance.setData('X-Session-Id', g_headers['X-Session-Id']);
    AnyBalance.saveData();
    AnyBalance.setResult(result);
}