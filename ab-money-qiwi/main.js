/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, количество сообщений и счетов в QIWI Кошельке.

Сайт компании: http://qiwi.ru
Личный кабинет: http://w.qiwi.ru
*/

function jsonp (obj) {
  return obj;
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://w.qiwi.ru/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите номер телефона');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var info = AnyBalance.requestGet (baseurl +
                                      'login.action?source=0&phone=7' +
                                      encodeURIComponent(prefs.login) +
                                      '&password=' +
                                      encodeURIComponent(prefs.password) +
                                      '&captcha=0&callback=jsonp');
    AnyBalance.trace ('Login result: ' + info);

    var res = eval(info);

    // Проверка ошибки входа
    if (res.error != 0) {
        var err = '';

        switch (res.error) {
            case 3:
                err = 'Ошибка входа. Возможно, неверно введен пароль';  // На самом деле, не факт, что это так, но на телефоне такая ситуация была, код - 3, описания ошибок нет.
                break;
        }

        for (var i in res.errors) {
            if (res.errors[i] == '')
                continue;

            if (err != '')
                err += '; ';
            err += res.errors[i];
        }

        if (err == '')
            err = 'Неопределенная ошибка. Пожалуйста, свяжитесь с автором скрипта.';
        else if (err == 'Введенные цифры неверны')  // Возможно, эта ситуация будет срабатывать только при отладке в Chrome
            err = 'Требуется ручной ввод. Пожалуйста, войдите в личный кабинет на <a href=\'http://w.qiwi.ru\'>домашней странице</a> QIWI Кошелька.';
        throw new AnyBalance.Error (err);
    }

    var html = AnyBalance.requestGet (baseurl + 'userdata.action');

    // Проверка на корректный вход
    if (/<h1>Кошелёк:/i.exec(html)){
    	AnyBalance.trace ('It looks like we are in selfcare...');
    }else if(/passwordchangesuccess.action/i.test(html)){
        throw new AnyBalance.Error('Срок действия пароля истек. Смените пароль, зайдя в свой QIWI-кошелек через браузер.');
    }else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

    var result = {success: true};

    // Баланс
    getParam (html, result, 'balance', /id="balance".*?>([+-]?(?:\d+[.,]?\d*|\d*[.,]?\d+))/i, [',', '.'], parseFloat);

    // Сообщения
    getParam (html, result, 'messages', /Сообщения:.*?>(\d+)/i, [], parseInt);

    // Счета
    getParam (html, result, 'bills', /Счета:.*?>(\d+)/i, [], parseInt);

    AnyBalance.setResult (result);
}
