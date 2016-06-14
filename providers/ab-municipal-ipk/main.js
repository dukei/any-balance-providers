function main() 
{
    AnyBalance.setDefaultCharset('utf-8');

    var result = {success: true};
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.email, 'Не задан email');
    checkEmpty(prefs.password, 'Не задан пароль');

    var html = AnyBalance.requestPost('https://portalgkh.ru/index.php?id=14', {
        username: prefs.email,
        password: prefs.password,
        service: 'login'
    });

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту! Попробуйте обновить данные позже.');
    }

    if (match = html.match(/<script type='text\/javascript'>alert\('(.+)'\);<\/script>/)) {
        throw new AnyBalance.Error(match[1]);
    }

    getParam(html, result, 'account', /<td>Номер лицевого[\s\S]{1,100}<strong>(.+)<\/strong>/);
    getParam(html, result, 'company', /<td>Управляющая компания[\s\S]{1,100}<strong>(.+)<\/strong>/);
    getParam(html, result, 'owner', /<td>Собственник[\s\S]{1,200}<strong>(.+)<\/strong>/);
    getParam(html, result, 'opened', /<td>Открыт[\s\S]{1,100}<strong>(.+)<\/strong>/, null, parseDate);
    getParam(html, result, 'address', /<td>Адрес[\s\S]{1,100}<strong>(.+)<\/strong>/);
    getParam(html, result, 'phone', /<td>Телефон[\s\S]{1,100}<strong>(.+)<\/strong>/);
    getParam(html, result, 'type', /<td>Тип собственности[\s\S]{1,100}<strong>(.+)<\/strong>/);

    html = AnyBalance.requestGet('https://portalgkh.ru/index.php?id=16&view=services');

    getParam(html, result, 'current_period', /<select id="period"[\s\S]+selected>(.{1,20})<\/option>/);

    var balances = getBalances(html);
    result['accrued'] = balances[3];
    result['paid'] = balances[5];
    result['to_pay'] = balances[6];

    AnyBalance.setResult(result);
}

function getBalances(html)
{
    var balances = [],
        match = 1,
        regexp = /<td class="total right">(.*)<\/td>/g;

    while (match != null) {
        match = regexp.exec(html);
        if (match) balances.push(parseBalance(match[1]));
    }

    return balances;
}
