/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает бонусные баллы за пользование услугами МТС.

Сайт оператора: http://www.mts.ru
Личный кабинет: http://www.bonus.mts.ru
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://wap.bonus.mts.ru/';
    var loginurl = 'https://login.mts.ru/amserver/UI/Login';

    checkEmpty (prefs.login, 'Введите номер телефона');
    checkEmpty (prefs.password, 'Введите пароль');

    AnyBalance.trace ('Trying to login at address: ' + loginurl);
    var html = AnyBalance.requestGet (loginurl + '?service=bonus&goto=http%3A%2F%2Fwap.bonus.mts.ru%2Fru%2Fpmsdata.html%3Ftarget%3Dmts_bonus_wap%2Findex%2Fpersonal_page_html');
    
    var idbutton = getParam(html, null, null, /javascript:LoginSubmit\('([^']*)'/i);
    var idgoto = getParam(html, null, null, /<input[^>]*name="goto"[^>]*value="([^"]*)"/);
    var loginURL = getParam(html, null, null, /<input[^>]*name="loginURL"[^>]*value="([^"]*)"/);
    
    html = AnyBalance.requestPost(loginurl, {
        IDToken0:'',
        IDToken1:prefs.login,
        IDToken2:prefs.password,
        IDButton:idbutton,
        'goto':idgoto,
        encoded:'true',
        initialNumber:'',
        loginURL:loginURL,
        gx_charset:'UTF-8'
    });
    
    var error = getParam(html, null, null, /(authErr)/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error("Ошибка авторизации. Проверьте логин и пароль.");

    // Проверка на корректный вход
    regexp = /login\.mts\.ru\/amserver\/UI\/Logout/;
    if (regexp.exec (html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором скрипта.');
    }

    var result = {success: true};

    // ФИО
    getParam (html, result, 'customer', /Ваш номер телефона:\s*(\d+)/i);

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
