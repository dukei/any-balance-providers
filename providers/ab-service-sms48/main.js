/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

    Получает баланс и статистику на сервисе рассылки SMS сообщений http://sms48.ru.

Сайт оператора: http://sms48.ru/
Личный кабинет: http://sms48.ru/cabinet.php
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "http://sms48.ru/cabinet.php";
    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password
    });

    if(!/\?exit/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]*color=['"]?#ff0000[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error && /Неправильный логин или пароль/i.test(error))
            throw new AnyBalance.Error(error, null, true);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var balance_block = getParam(html, null, null, /Ваш баланс[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if(!balance_block)
        throw new AnyBalance.Error('Не найден блок Ваш баланс. Сайт изменен?');

    result.__tariff = prefs.login;
    getParam(balance_block, result, 'balance', null, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
