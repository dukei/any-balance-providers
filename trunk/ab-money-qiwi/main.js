/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, количество сообщений и счетов в QIWI Кошельке.

Сайт компании: http://qiwi.ru
Личный кабинет: http://w.qiwi.ru
*/

function jsonp (obj) {
  return obj;
}

function main(){
    var prefs = AnyBalance.getPreferences ();
    switch(prefs.type){
    case 'new':
        mainNew();
        break;
    case 'old':
        mainOld();
        break;
    case 'auto':
    default:
        try{
            mainOld();
        }catch(e){
            if(e.fatal)
                throw e;
            AnyBalance.trace('Ошибка подключения к старому кабинету: ' + e.message + '\nПробуем новый...');
            mainNew();
        }
        break;
    }
}

function getFatalError(str){
    var e = new AnyBalance.Error(str);
    e.fatal = true;
    return e;
}

function mainNew () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://w.qiwi.com/';

    if (!prefs.login)
        throw getFatalError ('Введите номер телефона');

    if (!prefs.password)
        throw getFatalError ('Введите пароль');

    AnyBalance.trace ('Trying to enter NEW account at address: ' + baseurl);
    var info = AnyBalance.requestGet (baseurl +
                                      'auth/login.action?source=MENU&login=%2B7' +
                                      encodeURIComponent(prefs.login) +
                                      '&password=' +
                                      encodeURIComponent(prefs.password));
    AnyBalance.trace ('Login result: ' + info);

    var res = JSON.parse(info);

    // Проверка ошибки входа
    if (res.code.value != '0'){
	var errors = {
		0 : "ОК",
		1 : "Ошибка",
		2 : "Ошибка",
		3 : "Требуется авторизация",
		4 : "Требуется подтверждение",
		5 : "Требуется подтверждение",
		6 : "Срок действия пароля истек",
		success : "Успех",
		timeout : "Время соединения истекло. Проверьте подключение к сети",
		error : "Ошибка соединения. Проверьте подключение к сети",
		abort : "Запрос отменен",
		parsererror : "Синтаксическая ошибка"
	};

        throw new AnyBalance.Error (res.message || (res.messages ? res.messages.join('\n') : 'Не удаётся войти в QIWI кошелек: ' + errors[res.code.value]));
    }

    var html = AnyBalance.requestGet (baseurl + 'payment/main.action');

    // Проверка на корректный вход
    if (/\/auth\/logout\.action/i.exec(html)){
    	AnyBalance.trace ('It looks like we are in selfcare...');
        if(!getParam(html, null, null, /(profileBalance)/i)){
            //Похоже, проблема с паролем, устарел, наверное.
            var error = getParam(html, null, null, /<p[^>]+class="attention"[^>]*>\s*([\s\S]*?)\s*<\/p>/i);
            if(error)
                throw getFatalError(error.replace(/href="\//ig, 'href="https://w.qiwi.com/'));
            throw getFatalError('Срок действия пароля истек. Смените пароль, зайдя в свой QIWI-кошелек (https://w.qiwi.com) через браузер.');
        }
    }else if(/passwordchangesuccess.action/i.test(html)){
        throw getFatalError('Срок действия пароля истек. Смените пароль, зайдя в свой QIWI-кошелек (https://w.qiwi.com) через браузер.');
    }else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

    var result = {success: true};

    // Баланс
    getParam (html, result, 'balance', /id="person-accounts-RUB"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    // Сообщения (че-то непонятно, где они в новом личном кабинете)
    //getParam (html, result, 'messages', /Сообщения:.*?>(\d+)/i, [], parseInt);

    if(AnyBalance.isAvailable('bills')){
        html = AnyBalance.requestGet(baseurl + 'user/order/main.action?type=1');
        var count = html.match(/<div[^>]*ordersLine\s+NOT_PAID[^>]*>/ig);
        result.bills = count ? count.length : 0;
    }

    AnyBalance.setResult (result);
}

function mainOld () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://w.qiwi.ru/';

    if (!prefs.login || prefs.login == '')
        throw getFatalError ('Введите номер телефона');

    if (!prefs.password || prefs.password == '')
        throw getFatalError ('Введите пароль');

    AnyBalance.trace ('Trying to enter OLD account at address: ' + baseurl);
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
            err = 'Требуется ручной ввод. Пожалуйста, войдите в личный кабинет на <a href=\'https://w.qiwi.ru\'>домашней странице</a> QIWI Кошелька.';
        throw new AnyBalance.Error (err);
    }

    var html = AnyBalance.requestGet (baseurl + 'userdata.action');

    // Проверка на корректный вход
    if (/<h1>Кошелёк:/i.exec(html)){
    	AnyBalance.trace ('It looks like we are in selfcare...');
    }else if(/passwordchangesuccess.action/i.test(html)){
        throw getFatalError('Срок действия пароля истек. Смените пароль, зайдя в свой QIWI-кошелек (https://w.qiwi.ru) через браузер.');
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
