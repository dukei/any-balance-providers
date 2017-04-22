function main() {
    var url = 'http://xn--80aalwpcfpx2k.xn--p1ai/index.php'; // укнародная.рф

    auth(url);

    var html = request(url + '?option=com_auth&view=payment&Itemid=80');
    var $paymentsTable = $('.content', html).find('.Table:eq(1)');
    var $lastRow = $paymentsTable.find('tbody tr:last').prev('tr');
    var $cells = $lastRow.find('td');

    if ($cells.length != 5) {
        throw new AnyBalance.Error('Не удалось получить данные по платежам. Сайт изменён?');
    }

    AnyBalance.setResult({
        month: $cells.eq(0).text().trim(),
        debt_start: parseBalance($cells.eq(1).text()), // задолженность на начало периода
        charge: parseBalance($cells.eq(2).text()), // начислено
        paid: parseBalance($cells.eq(3).text()), // оплачено
        debt_end: parseBalance($cells.eq(4).text()), // задолженность на конец периода
        success: true
    });
}

function auth(url) {
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Не задан логин');
    checkEmpty(prefs.password, 'Не задан пароль');

    var html = request(url);
    var $loginForm = $('#form-login', html);
    var params = {};
    $($loginForm.serializeArray()).each(function(i, val) {
        params[val.name] = val.value;
    });
    params.username = prefs.login;
    params.passwd = prefs.password;
    html = request(url, 'post', params);

    var $error = $('#system-message .error.message', html);
    if ($error.length) {
        throw new AnyBalance.Error($error.text().trim());
    }
}

function request(url, method, params) {
    method = method || 'get';
    var html = method == 'get' ? AnyBalance.requestGet(url) : AnyBalance.requestPost(url, params);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту! Попробуйте обновить данные позже.');
    }
    return html;
}
