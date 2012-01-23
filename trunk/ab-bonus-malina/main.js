/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по баллам на карте накопительной программы Малина.

Сайт бонусной программы: http://www.malina.ru
Персональная страница: http://catalog.malina.ru/login.php
*/


function getParamFind (result, param, obj, search_str, regexp)
{
    if (!AnyBalance.isAvailable (param))
        return;

    var res = obj.find (search_str).text();
    if (regexp) {
        if (regexp.test (res))
            res = regexp.exec (res)[0];
        else
            return;
    }

    result[param] = res;
}


function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://catalog.malina.ru/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    AnyBalance.requestGet (baseurl);  // Запрос необходим для формирования cookie с регионом MSK
    var html = AnyBalance.requestPost (baseurl + 'login.php', {
        login: prefs.login,
        password: prefs.password
    });

    // Проверка неправильной пары логин/пароль
    var regexp=/id="alert"[\s\S]*?<p>(.*?)<\/p>/i;
    var res = regexp.exec (html);
    if (res) {
        res = res[1].replace ('Ошибка! ', '');
        throw new AnyBalance.Error (res);
    }

    // Проверка на корректный вход
    regexp = /\/logout.php/;
    if (regexp.exec(html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором.');
    }

    AnyBalance.trace ('Parsing data...');
    
    matches = /id="account"[\s\S]*?(<table>[\s\S]*?<\/table>)/.exec (html);
    if (!matches)
        throw new AnyBalance.Error ('Невозможно найти информацию об аккаунте, свяжитесь с автором');

    var result = {success: true};
  
    var $table = $(matches[0]);

    // Номер счета
    getParamFind (result, 'accountNumber', $table, 'tr:first-child td');

    // Владелец счета
    getParamFind (result, 'customer', $table, 'tr:nth-child(2) td');

    // Статус счета
    getParamFind (result, 'status', $table, 'tr:nth-child(4) td');

    // Накоплено основных баллов
    getParamFind (result, 'mainPoints', $table, 'tr:nth-child(6) td');

    // Накоплено EXPRESS-баллов
    getParamFind (result, 'expressPoints', $table, 'tr:nth-child(7) td');

    // Израсходовано баллов
    getParamFind (result, 'gonePoints', $table, 'tr:nth-child(8) td');

    // Сгорело баллов
    getParamFind (result, 'burnPoints', $table, 'tr:nth-child(9) td');

    // Баланс баллов
    getParamFind (result, 'balance', $table, 'tr:nth-child(10) td');

    // Доступно к оплате у партнеров
    getParamFind (result, 'availableForPay', $table, 'tr:nth-child(11) td', /\d+/);

    if (AnyBalance.isAvailable ('burnInThisMonth')) {

        AnyBalance.trace ('Fetching balance structure...');

        html = AnyBalance.requestGet (baseurl + 'personal/balance_structure.php');

        AnyBalance.trace ('Parsing balance structure...');
    
        matches = /<table\s*class="pure"[\s\S]*?<\/table>/.exec (html);
        if (matches) {
  
            var $table = $(matches[0]);

            // Аннулируемые в этом месяце баллы
            getParamFind (result, 'burnInThisMonth', $table, 'tr:nth-child(2) td:nth-child(2)');
        }
    }

    AnyBalance.requestGet (baseurl + 'logout.php');

    AnyBalance.setResult (result);
}
