/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/


function submitLogin (prefs) {
    var login
    login = "";
    for (var i = 0; i < prefs.login.length; i++) {
        var c = prefs.login.charCodeAt (i);
        if (c <= 57 && c >= 48) {
            login += prefs.login.charAt (i);
        } 
    }

    prefs.login = login;
    prefs.password = calcSHA1 (login + prefs.password);
}


function formatDate (date) {
    var day = date.getDate ();
    if (day < 10)
        day = '0' + day;

    var month = date.getMonth () + 1;
    if (month < 10)
        month = '0' + month;

    var hours = date.getHours ();
    if (hours < 10)
        hours = '0' + hours;

    var minutes = date.getMinutes ();
    if (minutes < 10)
        minutes = '0' + minutes;

    return date.getFullYear () + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
}



function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://prcab.x5club.ru/cwa/';

    checkEmpty (prefs.login, 'Введите номер карты');
    checkEmpty (prefs.password, 'Введите пароль');

    submitLogin (prefs);

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);

    var d = new Date ();
    var html = AnyBalance.requestPost (baseurl + 'login.do', {
        'job':        'LOGIN',
        'parameter':  formatDate (d),
        'pricePlan':  '',
        'login':      prefs.login,
        'pass':       '',
        'password':   prefs.password
    });

    // Проверка неправильной пары логин/пароль
    var regexp=/class="errorBoldText"[^>]*>([^<]*)/;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error (res[1]);

    // Проверка на корректный вход
    regexp = /logout.do\?menuId=TML/;
    if (regexp.exec(html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором скрипта.');
    }

    var result = {success: true};

    // Баланс
    getParam (html, result, 'balance', /Баланс:[^\d]*(\d*)/i, [], parseInt);

    if (AnyBalance.isAvailable ('customer')) {

        AnyBalance.trace ('Fetching account details...');

        html = AnyBalance.requestGet (baseurl + 'accountDetails.do');

        AnyBalance.trace ('Parsing account details...');

        // Владелец
        getParam (html, result, 'customer', /(Имя[\s\S]*?<td>([^<]*)[\s\S]*Фамилия[\s\S]*?<td>([^<]*))/i, [/Имя[\s\S]*?<td>(.)[^<]*[\s\S]*Фамилия[\s\S]*?<td>([^<]+)/, '$2 $1.']);
    }


    if (AnyBalance.isAvailable ('burnInThisMonth')) {

        AnyBalance.trace ('Fetching balance structure...');

        html = AnyBalance.requestGet (baseurl + 'balanceStructure.do');

        AnyBalance.trace ('Parsing balance structure...');
    
        matches = /<table[^>]*id=[^>]*class="results"[\s\S]*?<\/table>/.exec (html);
        if (!matches) {
            if (html.indexOf ('Не найдено аннулированных баллов') > 0) {
			    // Ничего не делаем. Есть подозрение, что это сбой на сервере
			} else {
                throw new AnyBalance.Error ('Невозможно найти информацию об аккаунте, свяжитесь с автором');
            }
        } else {

            var $table = $(matches[0]);

            // Сгорает в этом месяце
            getParamFind (result, 'burnInThisMonth', $table, 'tr:nth-child(2) td:nth-child(2)', undefined, [], parseInt);
        }
    }


    AnyBalance.setResult (result);
}
