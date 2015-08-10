/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на бонусной карте сети кинотеатров "КАРО Фильм".

Сайт кинотеатра: http://karofilm.ru
Личный кабинет: http://karofilm.ru/cgi-bin/register.pl?option=office
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://karofilm.ru/cgi-bin/';

    checkEmpty (prefs.login, 'Введите номер карты');
    checkEmpty (prefs.password, 'Введите пин-код');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestGet (baseurl +
        'booking/booking.pl?option=Show_details&card_number=' + 
        prefs.login + 
        '&pin=' + 
        prefs.password);

    // Проверка неправильной пары логин/пароль
    var regexp=/<script>parent\.window\.location = "\/cgi-bin\/register\.pl\?option=office&error=([^"]*)/i;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error (res[1]);

    // Проверка на корректный вход
    regexp = /Информация по карте/;
    if (regexp.exec(html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found info... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором скрипта.');
    }

    AnyBalance.trace ('Parsing data...');

    matches = html.match (/<table[^>]*class="xrasp"[^>]*>[\s\S]*?<\/table>/g);
    if (!matches)
        throw new AnyBalance.Error ('Невозможно найти информацию по карте, свяжитесь с автором провайдера.');

    var result = {success: true};

    var $table = $(matches[0]);

    // Владелец
    var customer = getParamFind (null, null, $table, 'tr:nth-child(2) td:nth-child(2)');
    if (customer) {
        customer = customer.replace (/НЕТ /gi, '');
        if (customer != '')
            result.customer = customer;
    }

    // Баланс
    getParamFind (result, 'balance', $table, 'tr:nth-child(3) td:nth-child(2)', null, ['руб', '.', 'коп', '', / /g, ''], parseFloat);

    // Дата окончания регистрации
    getParamFind (result, 'expiryDate', $table, 'tr:nth-child(4) td:nth-child(2)', null,
        [/ /g, '',
         'г.', '',
         /(\d+)([^\d]+)(\d+)/, '$3/$2/$1',
         'января', '01',
         'февраля', '02',
         'марта', '03',
         'апреля', '04',
         'мая', '05',
         'июня', '06',
         'июля', '07',
         'августа', '08',
         'сентября', '09',
         'октября', '10',
         'ноября', '11',
         'декабря', '12'], Date.parse);

    // Бонус
    getParamFind (result, 'bonus', $table, 'tr:nth-child(5) td:nth-child(2)', /(\d+)/, [], parseInt);

    
    // Попытка получить информацию о возможности перехода на новый бонусный уровень
    if (matches.length >= 2) {
        var $table = $(matches[matches.length - 1]);

        // Текущий бонус
        if (!result.bonus) {
            getParamFind (result, 'bonus', $table, 'tr:nth-child(2) td:nth-child(2)', /(\d+)/, [], parseInt);
        }

        // Условия получения бонуса
        getParamFind (result, 'conditionsForNewBonus', $table, 'tr:nth-child(7) td:nth-child(2)');
    }

    AnyBalance.setResult (result);
}
