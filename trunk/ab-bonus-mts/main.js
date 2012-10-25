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
    var html = AnyBalance.requestGet (loginurl + '?service=bonus&goto=http%3A%2F%2Fwap.bonus.mts.ru%2Fru%2Fpmsdata.html%3Ftarget%3Dmts_bonus_wap%2Findex%2Fpersonal_page_html&auth-status=0');
    
    var form = getParam(html, null, null, /<form[^>]+name="Login"[^>]*>([\s\S]*?)<\/form>/i);
    if(!form)
        throw new AnyBalance.Error("Не удаётся найти форму входа!");

    var params = createFormParams(form, function(params, input, name, value){
        var undef;
        if(name == 'IDToken1')
            value = prefs.login;
        else if(name == 'IDToken2')
            value = prefs.password;
        else if(name == 'noscript')
            value = undef; //Снимаем галочку
        else if(name == 'IDButton')
            value = '+%C2%F5%EE%E4+%E2+%CB%E8%F7%ED%FB%E9+%EA%E0%E1%E8%ED%E5%F2+';
       
        return value;
    });

//  AnyBalance.trace("Login params: " + JSON.stringify(params));

    var html = AnyBalance.requestPost(loginurl + "?service=bonus&goto=http%3A%2F%2Fwap.bonus.mts.ru%2Fru%2Fpmsdata.html%3Ftarget%3Dmts_bonus_wap%2Findex%2Fpersonal_page_html", params);
    
    if(!/\/amserver\/UI\/Logout/i.test(html)){
        var error = getParam(html, null, null, /(authErr)/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error("Ошибка авторизации. Проверьте логин и пароль.");
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    AnyBalance.trace ('It looks like we are in selfcare...');

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
