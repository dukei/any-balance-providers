/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на бонусной карте сети кинотеатров Формула Кино.

Сайт оператора: http://www.formulakino.ru/
Личный кабинет: http://www.formulakino.ru/eticket/login/
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.formulakino.ru/';

    checkEmpty (prefs.login, 'Введите логин');
    checkEmpty (prefs.password, 'Введите пароль');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestPost (baseurl + 'cgi-bin/auth.pl', {
        'login': prefs.login,
        'psw': prefs.password,
        'sub_option': 'auth',
        'uri_r': '/bron/eticket/login/'
    });

    // Проверка неправильной пары логин/пароль
    var regexp=/<!-- Ошибка авторизации -->/;
    var res = regexp.exec (html);
    if (res) {
        regexp=/style="color: #FF0000;">(.*?)<\/b><\/p>/;
        res = regexp.exec (html);
        if (res)
            throw new AnyBalance.Error (res[1]);
        else
            throw new AnyBalance.Error ('Неизвестная ошибка при авторизации. Пожалуйста, свяжитесь с автором скрипта.');
    }

    regexp = /<meta\s*http-equiv="refresh"\s*content="0;\s*url=([^"]*)">/i;
    var url = regexp.exec (html);
    if (url) {
        var html = AnyBalance.requestGet (baseurl + url[1]);
    }

    // Проверка на корректный вход
    regexp = /class="menuInOn"/;
    if (regexp.exec (html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором скрипта.');
    }

    var html = AnyBalance.requestGet (baseurl + 'cgi-bin/cards.pl?option=Show_details');

    var result = {success: true};

    var $table = $(html);
    table = $table.find ('table.tbl_srch');

    // Владелец
    getParamFind (result, 'customer', table, 'tr:nth-child(3) td:nth-child(2)');
    if (result.customer) {
        regexp = /(\S{1})(\S*)\s+(\S{1})\S*\s+(\S{1})\S*/;
        res = regexp.exec (result.customer);
        if (res)
          result.customer = res[1] + res[2].toLowerCase () + ' ' + res[3] + '.' + res[4];
    }

    // Баланс
    getParamFind (result, 'balance', table, 'tr:nth-child(4) td:nth-child(2)', undefined, [/(\d+)руб\s*(\d+)коп/, '$1.$2'], parseFloat);

    // Дата окончания регистрации
    getParamFind (result, 'endDate', table, 'tr:nth-child(5) td:nth-child(2)');
    if (result.endDate) {
        var months = ['-', 'янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        res = result.endDate;
        for (var i in months) {
          regexp = new RegExp ('\\s*' + months[i] + '\\S*\\s*', '');
          res = res.replace (regexp, '.' + i + '.');
        }
        res = res.replace ('г.', '');
        res = res.replace (/\.(\d{1})\./, '.0$1.');
        res = res.replace (/^(\d{1})\./, '0$1.');
        result.endDate = res;
    }

    // Текущий бонус
    getParamFind (result, 'bonus', table, 'tr:nth-child(6) td:nth-child(2)', /\d+/, [], parseInt);

    AnyBalance.setResult (result);
}
