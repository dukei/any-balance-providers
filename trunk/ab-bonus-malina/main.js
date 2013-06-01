/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по баллам на карте накопительной программы Малина.

Сайт бонусной программы: http://www.malina.ru
Персональная страница: http://catalog.malina.ru/login.php
*/


function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://www.malina.ru/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    AnyBalance.requestGet (baseurl + 'login.php');  // Запрос необходим для формирования cookie с регионом MSK
    var html = AnyBalance.requestPost (baseurl + 'login.php', {
        login: prefs.login,
        password: prefs.password,
        backurl: ''
    });

    // Проверка на корректный вход
    if(!/\/logout.php/i.test(html)){
        // Проверка неправильной пары логин/пароль
        var error = getParam(html, null, null, /<div[^>]+id="alert"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти на персональную страницу. Сайт изменен?');
    }

    AnyBalance.trace ('It looks like we are in selfcare...');

    AnyBalance.trace ('Parsing data...');
    
    matches = /class="points"/.exec (html);
    if (!/class="points"/i.test(html))
        throw new AnyBalance.Error ('Невозможно найти информацию об аккаунте, свяжитесь с автором');

    var result = {success: true};
  
    // Номер счета
    getParam (html, result, 'accountNumber', /<th[^>]*>Номер счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    // Владелец счета
    getParam (html, result, 'customer', /<th[^>]*>Владелец счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    // Статус счета
    getParam (html, result, 'status', /<th[^>]*>Статус счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    // Накоплено основных баллов
    //getParam (html, result, 'mainPoints', /<th[^>]*>Владелец счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    // Накоплено EXPRESS-баллов
    //getParam (html, result, 'expressPoints', $table, 'tr:contains("EXPRESS") td', parseBalance);

    // Израсходовано баллов
    //getParam (html, result, 'gonePoints', $table, 'tr:contains("Израсходовано баллов") td', parseBalance);

    // Сгорело баллов
    //getParamFind (result, 'burnPoints', $table, 'tr:contains("Сгорело баллов") td', parseBalance);

    // Баланс баллов
    getParam (html, result, 'balance', /<th[^>]*>Баланс баллов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    // Доступно к оплате у партнеров
    getParam (html, result, 'availableForPay', /<th[^>]*>Доступно к обмену на товары и услуги[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if (AnyBalance.isAvailable ('burnInThisMonth')) {

        AnyBalance.trace ('Fetching balance structure...');

        html = AnyBalance.requestGet (baseurl + 'siebel/personal/forecast/');

        AnyBalance.trace ('Parsing balance structure...');

        getParam(html, result, 'burnInThisMonth', /Баллов, которые сгорят в ближайшие месяцы —\s*(\d+)/i, null, parseBalance);
    }

    AnyBalance.setResult (result);
}
