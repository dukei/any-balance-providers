/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и статистику на сервисе рассылки SMS сообщений http://smsc.ru.

Сайт оператора: http://smsc.ru/
Личный кабинет: https://smsc.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://smsc.ru/login/",
        html = AnyBalance.requestGet(baseurl);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        psw:prefs.password,
        secure:'on'
    });

    if (!/logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /<table[^>]*style=['"][^"']*color:red[^"']*['"][^>]*>([\s\S]*?)<\/table>/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /неверный логин или пароль/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, 'balance', /Ваш баланс:[\s\S]*?<b[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'sent', /Отправлено сообщений:[\s\S]*?<b[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'answers', /Получено SMS:[\s\S]*?<b[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'licschet', /Номер договора:[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, '__tariff', /Тарифный план:((?:[^>]*>){3})/i, AB.replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
