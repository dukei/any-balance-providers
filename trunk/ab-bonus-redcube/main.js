/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на накопительной карте сети магазинов Красный Куб.

Сайт магазина: http://www.redcube.ru/
Личный кабинет: http://www.redcube.ru/clients/club/cabinet/
*/


function enter (url, data) {
    var html = AnyBalance.requestPost (url, data);

    var regexp=/<!--\s*\/Yandex.Metrika\s*counter\s*-->\s*(?:<script[^>]*>\s*<\/script>\s*)?([^\s<]+[^<]*)/i;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error (res[1]);

    return html;
}


function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.redcube.ru/clients/club/cabinet/';

    checkEmpty (prefs.number, 'Введите номер карты');
    checkEmpty (prefs.date, 'Введите дату рождения');

    var regexp=/(\d{2})\.(\d{2})\.(\d{2})/;
    var res = regexp.exec (prefs.date);
    if (!res || !Date.parse (res[2] + '-' + res[1] + '-' + res[3]))
        throw new AnyBalance.Error ('Дата рождения введена неправильно');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);

    var data = {number: prefs.number};
    enter (baseurl, data);
    data.date = prefs.date;
    var html = enter (baseurl, data);

    // Проверка на корректный вход
    regexp = /">Выйти</;
    if (regexp.exec(html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

    var result = {success: true};

    // ФИО
    getParam (html, result, 'customer', /Уважаемый\s*([^!]*)!/i);

    // Номер карты
    getParam (html, result, 'cardNumber', /Номер\s*Вашей\s*карты[^>]*>([^<]*)/i);

    // Остаток бонусов
    getParam (html, result, 'bonus', /Остаток\s*бонусов[^\d]*(\d*)/i, [], parseInt);

    // Сумма всех покупок
    getParam (html, result, 'costPurchase', /Сумма\s*всех\s*покупок[^\d]*(\d+[.,]?\d*)/i, [',', '.'], parseFloat);

    // Дата последней операции
    getParam (html, result, 'dateLastOperation', /Дата\s*последней\s*операции[^\d]*(\d{2}.\d{2}.\d{4})/i);

    AnyBalance.setResult (result);
}
