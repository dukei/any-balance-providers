/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусных баллах на клубных картах сети магазинов Л'Этуаль.

Сайт магазина: http://www.letoile.ru/
Проверка баланса: http://www.letoile.ru/club/cards/account/
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.letoile.ru/';

    checkEmpty (prefs.number, 'Введите номер карты');
    checkEmpty (prefs.color, 'Выберите цвет карты');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestGet (baseurl +
        'ajax/check_account.php?card_type=' + 
        prefs.color + 
        '&card_number=' +
        prefs.number);

    // Проверка неправильной пары логин/пароль
    if (!/Баланс\s*карты:/i.test(html)) {
        var regexp=/<div class="g-error">\s*([\s\S]*?)\s*</;
        var res = regexp.exec (html);
        if (res)
            throw new AnyBalance.Error (res[1]);
        throw new AnyBalance.Error ("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {};

    // Баланс
    getParam (html, result, 'balance', /Баланс\s*карты:[^\d]*(\d+\.?\d*)/i, [], parseFloat)

    result.success = true;


    var html = AnyBalance.requestGet (baseurl + 'club/cards/account/');

    // Дата актуализации баланса
    getParam (html, result, 'dateOf', /Данные о балансе[^\d]*(\d{2}.\d{2}.\d{4} \d{2}:\d{2})/i, [/(\d{2}).(\d{2}).(.*)/, '$2/$1/$3'], Date.parse);

    AnyBalance.setResult (result);
}
