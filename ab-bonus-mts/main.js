/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает бонусные баллы за пользование услугами МТС.

Сайт оператора: http://www.mts.ru
Личный кабинет: http://www.bonus.mts.ru
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://wap.bonus.mts.ru/';

    checkEmpty (prefs.login, 'Введите номер телефона');
    checkEmpty (prefs.password, 'Введите пароль');


    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestGet (baseurl);

    var regexp=/name="SID" value="([^"]*)"/i;
    var res = regexp.exec (html);
    if (!res)
        throw new AnyBalance.Error ('Не найден идентификатор сессии. Пожалуйста, свяжитесь с автором скрипта.');
    var sid = res[1];

    var html = AnyBalance.requestPost (baseurl + 'bstub?' + sid + ':com.buongiorno.ru.mts.bonus.jhub.wap.Login', {
        'SID': sid,
        'target_page': '/ru/pmsdata.html?' + sid + ':target=mts_bonus_wap/index/personal_page_html',
        'error_page': '/ru/pmsdata.html?' + sid + ':target=mts_bonus_wap/index/index_html',
        'kod_nomer': prefs.login,
        'pwd': prefs.password,
    });

    // Проверка неправильной пары логин/пароль
    var regexp=/class="error"><.*?>([^<]*)/i;
    var res = regexp.exec (html);
    if (res) {
        res = res[1];
        res = res.replace (' Учитывайте, что код и номер телефона вводятся в разные поля.', '')
        throw new AnyBalance.Error (res);
    }

    // Проверка на корректный вход
    regexp = /input name="logout"/;
    if (regexp.exec (html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором скрипта.');
    }

    var result = {success: true};

    // ФИО
    getParam (html, result, 'customer', /Здравствуйте,\s*([^\s<]+[^<]*?)\s*</i);

    // Баланс
    getParam (html, result, 'balance', /Баланс:\s*(\d+)/i, [], parseInt);

    // Стаж в программе
    getParam (html, result, 'lifeInProgram', /(Стаж в программе:\s*(?:(\d+)\s*год[^\s]*)?\s*(?:(\d+)\s*месяц[^\s]*)?\s*(?:(\d+)\s*(?:день|дня|дней))?)/i);
    if (result.lifeInProgram) {
        result.lifeInProgram = result.lifeInProgram.replace (/Стаж в программе:\s*/i, '');
        result.lifeInProgram = result.lifeInProgram.replace (/[\s]*год[^\s]*[\s]*/i, 'г ');
        result.lifeInProgram = result.lifeInProgram.replace (/[\s]*месяц[^\s]*[\s]*/i, 'мес ');
        result.lifeInProgram = result.lifeInProgram.replace (/[\s]*(день|дня|дней)[\s]*/i, 'дн ');
    }

    AnyBalance.setResult (result);
}
