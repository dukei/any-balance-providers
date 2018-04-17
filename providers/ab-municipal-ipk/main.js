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

    html = AnyBalance.requestPost('https://portalgkh.ru/index.php?id=16&view=reports', {
        report: 'moneymove',
        report_id: 1
    });

    // Услуги УК.
    var $row_uk = $('#collapseTwo table:eq(0) tr:last td', html);
    // Отопление и ГВС.
    var $row_gvs = $('#collapseTwo table:eq(1) tr:last td', html);

    if (!$row_uk.length || !$row_gvs.length) {
        throw new AnyBalance.Error('Не удалось получить данные по платежам. Сайт изменён?');
    }

    result['current_period'] = $row_uk.eq(0).text().trim();
    result['uk_accrued'] = parseBalance($row_uk.eq(5).text());
    result['uk_paid'] = parseBalance($row_uk.eq(6).text());
    result['uk_to_pay'] = parseBalance($row_uk.eq(7).text());
    result['gvs_accrued'] = parseBalance($row_gvs.eq(5).text());
    result['gvs_paid'] = parseBalance($row_gvs.eq(6).text());
    result['gvs_to_pay'] = parseBalance($row_gvs.eq(7).text());
    result['to_pay'] = result['uk_to_pay'] + result['gvs_to_pay'];

    AnyBalance.setResult(result);
}
