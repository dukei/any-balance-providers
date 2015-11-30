/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

 Для отладки в дебагере: параметр __debug
 Значения: pre - предоплата, post - постоплата, b2b - кабинет для юр. лиц.
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

var g_currencys = {
    руб: 'р',
    RUR: 'р',
    тенге:'₸',
    undefined: ''
}

function getBlock(url, html, _name) {
    var ret = getBlockInner(url, html, _name);
    if(typeof ret == 'string'){
        var name = _name.replace(/^\^/, '');
        var exact = name != _name;
        // Костыль для бонусов
        if(/bonusesForm/i.test(_name)) {
            name = getParam(name, null, null, /([^\s]+)/i);
        }
        return extractFromUpdate(ret, name, exact);
    }else{
        return ret;
    }

}

function getBlockInner(url, html, _name) {
    //Если имя начинается с ^, то оно точное
    var name = _name.replace(/^\^/, '');
    var exact = name != _name;

    var formhtml = html;
    if (isArray(html)) { //Если массив, то разный хтмл для поиска блока и для формы
        formhtml = html[1];
        html = html[0];
    }

    var re = new RegExp("PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*u:\\s*'" + (exact ? "" : "[^']*") + name);
    var data = getParam(html, null, null, re);
    if (!data) {
        AnyBalance.trace('Блок ' + _name + ' не найден!');
        return '';
    }

    var formId = getParam(data, null, null, /f:\s*'([^']*)/, replaceSlashes);
    if (!formId) {
        AnyBalance.trace('Не найден ID формы для блока ' + _name + '!');
        return '';
    }

    var form = getParam(formhtml, null, null, new RegExp('<form[^>]+name="' + formId + '"[\\s\\S]*?</form>', 'i'));
    if (!form) {
        AnyBalance.trace('Не найдена форма ' + formId + ' для блока ' + _name + '!');
        return '';
    }

    var params = createFormParams(form);
    var source = getParam(data, null, null, /s:\s*'([^']*)/, replaceSlashes);
    var render = getParam(data, null, null, /u:\s*'([^']*)/, replaceSlashes);

    params['javax.faces.partial.ajax'] = true;
    params['javax.faces.source'] = source;
    params['javax.faces.partial.execute'] = '@all';
    params['javax.faces.partial.render'] = render;
    //params[render] = render;
    params[source] = source;

    if(url) {
        html = AnyBalance.requestPost(url, params, addHeaders({
            Referer: url,
            'Faces-Request': 'partial/ajax',
            'X-Requested-With': 'XMLHttpRequest'
        }));
        return html;
    } else {
        return params;
    }
}

function extractFromUpdate(html, name, exact){
    var re = new RegExp('<update[^>]*id="' + (exact ? '' : '[^"]*') + name + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i');
    var data = getParam(html, null, null, re);
    if (!data) {
        AnyBalance.trace('Неверный ответ для блока ' + name + ': ' + html);
        return '';
    }

    return data;
}

function refreshBalance(url, html, htmlBalance) {
    //var data = getParam(htmlBalance, null, null, /PrimeFaces\.\w+\s*\(\s*\{[^}]*update:\s*'[^']*headerBalance/);
    var data = getParam(html, null, null, /PrimeFaces\.\w+\s*[^}]*(?:header|home)Balance/i);

    if (!data) {
        AnyBalance.trace('Блок headerBalance не найден!');
        return '';
    }

    var form = getParam(html, null, null, /<form[^>]*action="(?:[^>]*>){3}\s*loadingBalance[\s\S]*?<\/form>/i)
    if (!form) {
        AnyBalance.trace('Не найдена форма для блока (?:header|home)Balance!');
        return '';
    }

    var source = getParam(form, null, null, /s:\s*["']([^"']+)/i, replaceSlashes);
    var render = getParam(data, null, null, /(?:u|block):\s*["']([^"']+)/i, replaceSlashes);

    var viewState = getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]+)/i, null, html_entity_decode);

    //var formId = getParam(form, null, null, /id="([^"]*)/i, null, html_entity_decode);
    var params = createFormParams(form);
    params['javax.faces.partial.ajax'] = true;
    params['javax.faces.source'] = source;
    params['javax.faces.partial.execute'] = '@all';
    params['javax.faces.partial.render'] = render;
    params[source] = source;
    params['javax.faces.ViewState'] = viewState;

    html = AnyBalance.requestPost(url, params, addHeaders({
        Referer: url,
        'Faces-Request': 'partial/ajax',
        'X-Requested-With': 'XMLHttpRequest'
    }));

    return extractFromUpdate(html, render, true);
}

function getBonusesBlock(url, html, name, exact, onlyReturnParams) {
    var formhtml = html;
    if (isArray(html)) { //Если массив, то разный хтмл для поиска блока и для формы
        formhtml = html[1];
        html = html[0];
    }

    var re = new RegExp("(?:loadingbonusesloaderDetails|loadingAccumulators)\\s*=\\s*function\\(\\) \\{PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*u:\\s*'" + (exact ? "" : "[^']*") + name);

    var data = getParam(html, null, null, re);
    if (!data) {
        AnyBalance.trace('Блок ' + name + ' не найден!');
        return '';
    }

    var formId = getParam(data, null, null, /f:\s*'([^']*)/, replaceSlashes);
    if (!formId) {
        AnyBalance.trace('Не найден ID формы для блока ' + name + '!');
        return '';
    }

    var form = getParam(formhtml, null, null, new RegExp('<form[^>]+name="' + formId + '"[\\s\\S]*?</form>', 'i'));
    if (!form) {
        AnyBalance.trace('Не найдена форма ' + formId + ' для блока ' + name + '!');
        return '';
    }

    var params = createFormParams(form);
    var source = getParam(data, null, null, /s:\s*'([^']*)/, replaceSlashes);
    var render = getParam(data, null, null, /u:\s*'([^']*)/, replaceSlashes);

    params['javax.faces.partial.ajax'] = true;
    params['javax.faces.source'] = source;
    params['javax.faces.partial.execute'] = '@all';
    params['javax.faces.partial.render'] = render;
    //params[render] = render;
    params[source] = source;

    if(!onlyReturnParams) {
        html = AnyBalance.requestPost(url, params, addHeaders({
            Referer: url,
            'Faces-Request': 'partial/ajax',
            'X-Requested-With': 'XMLHttpRequest'
        }));
        // Костыль для бонусов
        if(/bonusesForm/i.test(name)) {
            name = getParam(name, null, null, /([^\s]+)/i);
        }
        var re = new RegExp('<update[^>]*id="' + (exact ? '' : '[^"]*') + name + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i');
        data = getParam(html, null, null, re);
        if (!data) {
            AnyBalance.trace('Неверный ответ для блока ' + name + ': ' + html);
            return '';
        }
        return data;
    } else {
        return params;
    }
}

function myParseCurrency(text) {
    var val = html_entity_decode(text).replace(/\s+/g, '').replace(/[\-\d\.,]+/g, '');
    val = g_currencys[val];
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function checkCorrectNumberLogin(baseurl, html) {
    var prefs = AnyBalance.getPreferences();

    var phone = getParam(html, null, null, [/"sso-number"[^>]*>([^<]*)/i, /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i], [/\D/g, '']);
    if(!phone)
        throw new AnyBalance.Error('Не удалось выяснить на какой номер мы залогинились, сайт изменен?');

    AnyBalance.trace('Судя по всему, мы уже залогинены на номер ' + phone);

    var needeedPhone = prefs.phone || prefs.login;

    if(!endsWith(phone, needeedPhone)) {
        AnyBalance.trace('Залогинены на неправильный номер ' + phone + ' т.к. в настройках указано, что номер должен заканчиваться на ' + needeedPhone + '. Надо перелогиниться.');
        AnyBalance.requestGet(baseurl + 'c/logout.xhtml', addHeaders({Referer: AnyBalance.getLastUrl()})); //Реферер обязательно, иначе она не знает, из какого кабинета выходить
        AnyBalance.requestGet(baseurl + 'oam_logout_success', g_headers);
        return false;
    }
    AnyBalance.trace('Залогинены на правильный номер ' + phone);
    return true;
}

function loginProc(baseurl, action, params, prefs) {
    var html;
    //Теперь, когда секретный параметр есть, можно попытаться войти
    try {
        html = AnyBalance.requestPost(baseurl + (action || 'login.xhtml'), params, addHeaders({Referer: baseurl + 'login.xhtml'}));
    } catch(e) {
        if(prefs.__debug) {
            if(prefs.__debug == 'b2b')
                html = AnyBalance.requestGet(baseurl + 'b/index.xhtml');
            else
                html = AnyBalance.requestGet(baseurl + 'c/' + prefs.__debug + '/index.html');
        } else {
            throw e;
        }
    }
    return html;
}

function isMultinumbersCabinet(html) {
    var accounts = sumParam(html, null, null, /selectAccount\('\d+'\);/ig);
    return accounts.length > 1;
}

function canUseMobileApp(prefs){
    return (!prefs.phone || prefs.phone == prefs.login) && /^\d{10}$/.test(prefs.login);
}

function login(baseurl) {
    AnyBalance.setDefaultCharset('utf-8');

    var prefs = AnyBalance.getPreferences();

    if(prefs.password){
        return loginWithPassword(baseurl);
    }else{
    	return loginWithoutPassword(baseurl);
    }
}

function isLoggedIn(html){
    return /logOutLink|Загрузка баланса\.\.\.|b\/logout.xhtml/i.test(html);
}

function getLKType(html){
    // Определим, может мы вошли в кабинет для юр. лиц?
    if (/b\/logout.xhtml/i.test(html)) {
        __setLoginSuccessful();
        return {type: 'B2B', html: html};
    }

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if (!isLoggedIn(html)) {
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, [/<div[^>]+class="error-page[\s|"][^>]*>([\s\S]*?)<\/div>/i, /<span[^>]+class="ui-messages-error-summary"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неправильные логин и\s*(?:\(или\)\s*)?пароль/i.test(error));

        if (AnyBalance.getLastStatusCode() > 400) {
            AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
            throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
        }

        var message = getParam(html, null, null, /<h1>\s*(Личный кабинет временно недоступен\s*<\/h1>[\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        if(message)
            throw new AnyBalance.Error(message);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    __setLoginSuccessful();
    if (/postpaid/i.test(html)) {
        return {type: 'POSTPAID', html: html};
    } else {
        return {type: 'PREPAID', html: html};
    }
}

function loginWithPassword(baseurl){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var tform = getParam(html, null, null, /<form[^>]+name="loginFormB2C:loginForm"[^>]*>[\s\S]*?<\/form>/i);

    // Похоже что обновляемся через мобильный инет, значит авторизацию надо пропустить
    if(isLoggedIn(html)) {
        AnyBalance.trace('Похоже, что мы запустились через мобильный интернет.');
        // Теперь необходимо проверить, на то номер мы вошли или нет, нужно для обновления через мобильный интернет
        if(!checkCorrectNumberLogin(baseurl, html)){
            html = AnyBalance.requestGet(baseurl + 'login.xhtml', g_headers);
            tform = getParam(html, null, null, /<form[^>]+name="loginFormB2C:loginForm"[^>]*>[\s\S]*?<\/form>/i);
        }
    }

    // Авторизуемся, независимо ни от чего, кроме как от наличия формы входа
    if(tform) {
        AnyBalance.trace('Похоже, что форма авторизации присутствует.');

        var params = createFormParams(tform);
        params['loginFormB2C:loginForm:login'] = prefs.login;
        params['loginFormB2C:loginForm:password'] = prefs.password;
        params['loginFormB2C:loginForm:passwordVisible'] = prefs.password;
        params['loginFormB2C:loginForm:loginButton'] = '';

        var action = getParam(tform, null, null, /<form[^>]+action="\/([^"]*)/i, null, html_entity_decode);

        //Теперь, когда секретный параметр есть, можно попытаться войти
        for(var i = 1 ; i < 6; i++) {
            var html = loginProc(baseurl, action, params, prefs);
            // Если нет показывают ошибки входа, надо попробовать еще раз
            if(/Вход в личный кабинет/i.test(html) && !/<span[^>]+class="ui-messages-error-summary"/i.test(html)) {
                AnyBalance.trace('Войти не удалось, сайт не сообщает ни о каких ошибках, попытка №' + i);
                continue;
            } else {
                AnyBalance.trace('Выполнили ' + i + ' попыток входа..');
                break;
            }
        }
    }else if(!isLoggedIn(html)){
        AnyBalance.trace('Похоже, форма авторизации отсутствует.');
        if (AnyBalance.getLastStatusCode() > 400) {
            AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
            throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
    }

    // Иногда билайн нормальный пароль считает временным и предлагает его изменить, но если сделать еще один запрос, пускает и показывает баланс
    if (/Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html)) {
        AnyBalance.trace('Билайн считает наш пароль временным, но это может быть и не так, попробуем еще раз войти...');
        html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({Referer: baseurl + 'login.html'}));
    }
    // Ну и тут еще раз проверяем, получилось-таки войти или нет
    if (/<form[^>]+name="(?:chPassForm)"|Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html))
        throw new AnyBalance.Error('Вы зашли по временному паролю, требуется сменить пароль. Для этого войдите в ваш кабинет ' + baseurl + ' через браузер и смените там пароль. Новый пароль введите в настройки данного провайдера.', null, true);
    if (/<form[^>]+action="\/(?:changePass|changePassB2C).html"/i.test(html))
        throw new AnyBalance.Error('Билайн требует сменить пароль. Зайдите в кабинет ' + baseurl + ' через браузер и поменяйте пароль на постоянный.', null, true);

    return getLKType(html);
}

function proceedWithSite(baseurl, type, html, result){
    getParam(type, result, 'type');

    switch(type){
        case 'B2B':
            fetchB2B(baseurl, html, result);
            break;
        case 'PREPAID':
            fetchPre(baseurl, html, result);
            break;
        case 'POSTPAID':
            fetchPost(baseurl, html, result);
            break;
        default:
            throw new AnyBalance.Error('Неизвестный тип кабинета: ' + type);
    }
}

function parseBalanceNegative(str) {
    var val = parseBalance(str);
    if (isset(val))
        return -val;
}

function fetchB2B(baseurl, html, result) {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.trace('Мы в кабинете для юр. лиц...');

    getParam(html, result, 'fio', /"user-name"([^>]*>){2}/i, replaceTagsAndSpaces, capitalFirstLetters);
    if (AnyBalance.isAvailable('balance', 'agreement', 'currency', 'overpay')) {
        var accounts = sumParam(html, null, null, /b\/info\/contractDetail\.xhtml\?objId=\d+[^>]*>\d{5,10}/ig);

        if(!accounts || accounts.length < 1) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось найти ни одного договора, сайт изменен, либо проблемы на сайте.');
        }

        AnyBalance.trace('Договоров: ' + accounts.length);
        // Пока мы не знаем как будет выглядеть кабинет с двумя и более договорами, пока получим по первому
        var current = accounts[0];
        var currentNum = getParam(current, null, null, />(\d+)/);
        var currentId = getParam(current, null, null, /b\/info\/contractDetail\.xhtml\?objId=(\d+)/i);
        var currentHref = getParam(current, null, null, /b\/info\/contractDetail\.xhtml\?objId=\d+/i);

        AnyBalance.trace('Получим информацию по договору: ' + currentNum);

        html = AnyBalance.requestGet(baseurl + currentHref, g_headers);

        getParam(html, result, 'agreement', /Договор №([\s\d]+)/i, replaceTagsAndSpaces);
        // Неизвестно что и как выводить, пока сделаем так, может нужно будет переделать
        getParam(html, result, 'balance', /class="balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Сумма неоплаченных счетов[^\d]+/i, '-'], parseBalance);
        getParam(html, result, 'overpay', /class="[^>]*balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Сумма неоплаченных счетов[^\d]+/i, '-'], parseBalance);
        getParam(html, result, ['currency', 'balance'], /class="balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /все счета оплачены/, '', /[.,]/g, ''], parseCurrency);
    }
    //Получим страницу с тарифом и опциями
    html = AnyBalance.requestGet(baseurl + 'b/info/abonents/catalog.xhtml', g_headers);

    var number = prefs.phone || '\\d{4}';

    // Если указан телефон, надо его найти, актуально для тех у кого больше 10 номеров, они не помещаются на странице
    if(prefs.phone) {
        var form = getParam(html, null, null, /<form[^>]*id="mobileDataForm"[\s\S]*?<\/form>/i);

        checkEmpty(form, 'Не удалось найти форму поиска номера, сайт изменен?', true);

        var params = getBlock(null, html, '^mobileDataForm');

        params['mobileDataForm:abonents:telephoneNum'] = prefs.phone;
        params['javax.faces.partial.execute'] = 'mobileDataForm';

        html = AnyBalance.requestPost(baseurl + 'b/info/abonents/catalog.xhtml', params, addHeaders({
            Referer: baseurl + 'b/info/abonents/catalog.xhtml',
            'Faces-Request': 'partial/ajax',
            'X-Requested-With': 'XMLHttpRequest'
        }));

        var re = new RegExp('<update[^>]*id="mobileDataForm"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i');
        data = getParam(html, null, null, re);
        if (!data) {
            AnyBalance.trace('Неверный ответ для блока mobileDataForm: ' + html);
            html = '';
        } else {
            html = data;
        }
    }

    var href = getParam(html, null, null, new RegExp('(b/info/subscriberDetail\\.xhtml\\?objId=\\d+)(?:[^>]*>){4}\\d{4,6}' + number, 'i'));

    checkEmpty(href, 'Не удалось найти ' + (prefs.phone ? 'номер с последними цифрами ' + prefs.phone : 'ни одного номера!'), true);

    html = AnyBalance.requestGet(baseurl + href, g_headers);

    getParam(html, result, 'phone', /subheader\s*"([^>]*>){3}/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тариф:([^>]*>){5}/i, replaceTagsAndSpaces);


    // Трафик из детализации, пока не работает
    // if(isAvailable()) {
    // var form = getParam(html, null, null, /<form id="reportDetailUnbilledButtonsForm"[\s\S]*?<\/form>/i);
    // if(form) {
    // var xhtml = getBlock(baseurl + 'faces/info/subscriberDetail.html', form, '^reportDetailUnbilledButtonsForm');

    // var params = getBlock(null, xhtml, '^reportDetailUnbilledButtonsForm');

    // params['javax.faces.partial.render'] = 'reportDetailUnbilledButtonsForm messages reportDetailUnbilledExcelButtonForm:excelDetailOnlineButton';

    // html = AnyBalance.requestPost(baseurl + 'faces/info/subscriberDetail.html', params, addHeaders({
    // Referer: baseurl + href,
    // 'Faces-Request': 'partial/ajax',
    // 'X-Requested-With': 'XMLHttpRequest'
    // }));
    // }
    // }

    // Это расходы из детализации
    if(isAvailable('balance')) {
        var form = getParam(html, null, null, /<form id="reportDetailUnbilledButtonsForm"[\s\S]*?<\/form>/i);
        if(form) {
            /*
             javax.faces.partial.ajax:true
             javax.faces.source:reportDetailUnbilledButtonsForm:j_idt2444
             javax.faces.partial.execute:@all
             javax.faces.partial.render:messages reportDetailUnbilledForm reportDetailUnbilledExcelButtonForm:excelDetailOnlineButton unbilledConfirDlg
             reportDetailUnbilledButtonsForm:j_idt2444:reportDetailUnbilledButtonsForm:j_idt2444
             reportDetailUnbilledButtonsForm:reportDetailUnbilledButtonsForm
             javax.faces.ViewState:-2522423474342426299:3960040617829553771
             */

            // var xhtml = getBlock(baseurl + 'b/info/subscriberDetail.xhtml', form, 'reportDetailUnbilledButtonsForm');

            // var params = getBlock(baseurl + 'b/info/subscriberDetail.xhtml', xhtml, 'reportDetailUnbilledButtonsForm', 'reportDetailUnbilledButtonsForm', true);

            // params['javax.faces.partial.render'] = 'reportDetailUnbilledButtonsForm messages reportDetailUnbilledExcelButtonForm:excelDetailOnlineButton';

            // html = AnyBalance.requestPost(baseurl + 'b/info/subscriberDetail.xhtml', params, addHeaders({
            // Referer: baseurl + href,
            // 'Faces-Request': 'partial/ajax',
            // 'X-Requested-With': 'XMLHttpRequest'
            // }));

            //Итого с НДС[^>]*>([\s\S]*?)<\/div>
        }
    }




    // Бонусы
    var bonuses = sumParam(html, null, null, /class="accumulator"[^>]*>([\s\S]*?)<\/div/ig);
    AnyBalance.trace('Найдено бонусов и пакетов: ' + bonuses.length);

    for (var i = 0; i < bonuses.length; i++) {
        var curr = bonuses[i];
        var name = getParam(curr, null, null, /([^<]*)</i);
        var usedMin = getParam(curr, null, null, /израсходовано[^>]*>([\s\d.,]+мин)/i, replaceTagsAndSpaces, parseMinutes);
        var totalMin = getParam(curr, null, null, /из доступных[^>]*>([\s\d.,]+мин)/i, replaceTagsAndSpaces, parseMinutes);
        var usedSms = getParam(curr, null, null, /израсходовано[^>]*>([\s\d.,]+штук)/i, replaceTagsAndSpaces, parseBalance);
        var totalSms = getParam(curr, null, null, /из доступных[^>]*>([\s\d.,]+штук)/i, replaceTagsAndSpaces, parseBalance);

        // Это пакет опций
        if (/Ноль на Билайн/i.test(name) && isset(usedMin) && isset(totalMin)) {
            sumParam(totalMin - usedMin, result, 'min_bi', null, null, null, aggregate_sum);
            // Это минуты
        } else if (isset(usedMin) && isset(totalMin)) {
            if(!isset(result['min_left_1']) && !isset(result['min_left_2']))
                sumParam(totalMin - usedMin, result, 'min_left_1', null, null, null, aggregate_sum);
            else if(isset(result['min_left_1']) && !isset(result['min_left_2']))
                sumParam(totalMin - usedMin, result, 'min_left_2', null, null, null, aggregate_sum);
            else
                sumParam(totalMin - usedMin, result, 'min_local', null, null, null, aggregate_sum);
            // Это смс
        } else if (isset(usedSms) && isset(totalSms)) {
            sumParam(totalSms - usedSms, result, 'sms_left', null, null, null, aggregate_sum);
        } else {
            AnyBalance.trace('Неизвестная опция, либо неизвестные единицы измерений: ' + curr);
        }
    }

    // Новое отображение данных
    if(bonuses.length == 0 ) {
        getBonuses(html, result);
    }
}

function processInfo_basic(baseurl, html, result){
    getParam(html, result.info, 'info.more3', /Вы с нами больше трёх лет!/i, null, function(str) { return !!str });
    getParam(html, result.info, 'info.phone', /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result.info, 'info.region', /<div[^>]+region[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
}

function processInfoPost_basic(baseurl, html, result){
    if(AnyBalance.isAvailable('info.fio', 'info.email', 'info.phone')){
        if(!result.info)
            result.info = {};

        getParam(html, result.info, 'info.fio', /<div[^>]+class="ban-param name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(AnyBalance.isAvailable('info.email')) {
            var xhtml = html;
            if(!/<div[^>]+class="email-fixed-width"[^>]*>/i.test(html))
                xhtml = getBlock(baseurl + 'c/post/index.xhtml', html, 'benAddressLoaderDetails');
            getParam(xhtml, result.info, 'info.email', /<div[^>]+class="email-fixed-width"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        }

        processInfo_basic(baseurl, html, result);
    }
}

function switchNumberPost(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if (!/^\d{4,10}$/.test(prefs.phone))
        throw new AnyBalance.Error('Введите от 4 до 10 последних цифр номера дополнительного телефона без пробелов и разделителей или не вводите ничего, чтобы получить информацию по первому номеру!', null, true);

    var cabinetType = 1;
    // Оказывается есть два типа кабинета с несколькими номерами..
    //Если задан номер, то надо сделать из него регулярное выражение
    var regnumber = prefs.phone.replace(/(\d)/g, '$1[\\s\\-()]*');
    var re = new RegExp('(?:<a[^>]*>\\s*)?<span[^>]*>\\+7[0-9\\s\\-()]*' + regnumber + '</span>', 'i');
    var numinfo = getParam(html, null, null, re);
    // Пробуем второй тип кабинета
    if(!isset(numinfo)) {
        cabinetType = 2;
        re = new RegExp('div[^>]*(?:>)[^>]*onclick="\\s*selectAccount\\([\'\\"]\\d*' + prefs.phone + '[\'\\"][^>]*', 'i');
        numinfo = getParam(html, null, null, re);
        if (!numinfo)
            throw new AnyBalance.Error('Не найден присоединенный к договору номер телефона, оканчивающийся на ' + prefs.phone);
    }

    var num = getParam(numinfo, null, null, /selectAccount\('([^']*)/, replaceSlashes);
    if(!isset(num))
        num = getParam(numinfo, null, null, null, replaceTagsAndSpaces, html_entity_decode);

    checkEmpty(num, 'Не удалось найти номер на который необходимо переключиться, сайт изменен?', true);

    if (/sso-account-current|class="selected"/i.test(numinfo)) {
        AnyBalance.trace('Дополнительный номер ' + num + ' уже выбран');
    } else {
        AnyBalance.trace('Переключаемся на номер ' + num);

        if (cabinetType == 1) {
            var formid = getParam(numinfo, null, null, /addSubmitParam\('([^']*)/, replaceSlashes);
            var params = getParam(numinfo, null, null, /addSubmitParam\('[^']*',(\{.*?\})\)/, null, getJsonEval);
        } else {
            var formid = getParam(html, null, null, /changeUser\s*=[^<]*?(?:f|formId):["']([^"']+)/i, replaceSlashes);
            var source = getParam(html, null, null, /changeUser\s*=[^<]*?(?:s|source):["']([^"']+)/i, replaceSlashes);
        }

        var form = getParam(html, null, null, new RegExp('<form[^>]+id="' + formid + '"[^>]*>([\\s\\S]*?)</form>', 'i'));
        if (!form) {
            AnyBalance.trace(numinfo);
            throw new AnyBalance.Error('Дополнительный номер ' + num + ' найден, но переключиться на него не удалось. Возможны изменения в личном кабинете...');
        }

        if (cabinetType == 1) {
            var fparams = createFormParams(form);
            params = joinObjects(fparams, params);
        } else {
            var fparams = createFormParams(form);
            params = joinObjects(fparams, {
                'javax.faces.partial.ajax': 'true',
                'javax.faces.source': source,
                'javax.faces.partial.execute': '@all',
                newSsoLogin: num
            });
            params[source] = source;
        }

        try {
            html = AnyBalance.requestPost(baseurl + 'c/post/index.xhtml', params, addHeaders({Referer: baseurl + 'c/post/index.xhtml'}));
        } catch (e) {
        }

        // Надо перейти, чтобы узнать какой тип кабинета
        html = AnyBalance.requestGet(baseurl + 'c', g_headers);
    }
    return html;
}

function fetchPost(baseurl, html, result) {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.trace('Мы в постоплатном кабинете');

    var multi = /onclick\s*=\s*"\s*selectAccount\('\d{10}|<span[^>]+class="selected"[^>]*>/i.test(html), xhtml='';

    // Пытаемся исправить всякую ерунду в балансе и валюте
    var balancesReplaces = [replaceTagsAndSpaces, /информация[^<]*недоступна|недоступна|временно недоступен/ig, ''];

    getParam(html, result, 'agreement', /<h2[^>]*>\s*Договор №([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'tariff', /<h2[^>]*>(?:[\s\S](?!<\/h2>))*?Текущий тариф([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);

    if (!multi) {
        AnyBalance.trace('Похоже на кабинет с одним номером.');

        if (prefs.phone)
            throw new AnyBalance.Error('Указан дополнительный номер телефона, но в кабинете нет прикрепленных номеров!');
    } else {
        AnyBalance.trace('Похоже на кабинет с несколькими номерами.');

        if (prefs.phone) {
            html = switchNumberPost(baseurl, html);
            // И только потом:
            // Бывает что к постоплатному кабинету привязан предоплатный номер, проверяем..
            if(/c\/pre\/index\.xhtml/i.test(html)) {
                AnyBalance.trace('Дополнительный номер ' + num + ' предоплатный, но привязан к постоплатному кабинету...');
                html = AnyBalance.requestGet(baseurl + 'c/pre/index.xhtml', g_headers);
                fetchPre(baseurl, html, result);
                return;
            } else {
                // Вроде помогает переход на главную
                html = AnyBalance.requestGet(baseurl + 'c/post/index.xhtml', g_headers);
            }
        }
        //Если несколько номеров в кабинете, то почему-то баланс надо брать отсюда
        if (AnyBalance.isAvailable('balance', 'currency')) {
            xhtml = refreshBalance(baseurl + 'c/post/index.xhtml', html);
            //xhtml = getBlock(baseurl + 'c/post/index.html', html, 'homeBalance');

            getParam(xhtml + html, result, 'balance', /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, parseBalance);
            getParam(xhtml + html, result, ['currency', 'prebal', 'overpay', 'balance'], /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, myParseCurrency);
        }
    }

    var phone = getParam(html, null, null, /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam('POSTPAID', result, 'type');

    processInfoPost_basic(baseurl, html, result);

    if (isAvailableBonuses()) {
        AnyBalance.trace('Запросим бонусы...');
        xhtml = html;
        // Надо проверить, получили ли мы бонусы
        var bonuses = getFoundBonuses(xhtml);
        // И если не получили - пробуем другие варианты
        if(bonuses.length === 0) {
            // Теперь только бонусы станут видны
            xhtml = getBlock(baseurl + 'c/post/index.xhtml', html, 'bonusesloaderDetails');
        }

        getBonuses(xhtml, result);
    }

    if (AnyBalance.isAvailable('overpay', 'prebal', 'currency', 'bills')) {
        AnyBalance.trace('Получаем информацию статусе оплаты');
        xhtml = html;
        if(!/<div[^>]+id="[^"]*:bills-info"/i.test(html))
            xhtml = getBlock(baseurl + 'c/post/index.xhtml', html, 'callDetailsDetails');

        getParam(xhtml, result, 'overpay', /<h4[^>]*>Переплата[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, balancesReplaces, parseBalance);
        getParam(xhtml, result, 'overpay', /<h4[^>]*>Осталось к оплате[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, balancesReplaces, parseBalanceNegative);
        getParam(xhtml, result, 'prebal', /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, parseBalance);
        getParam(xhtml, result, ['currency', 'prebal', 'overpay', 'balance'], /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, myParseCurrency);
        // Выставленные счета
        sumParam(xhtml, result, 'bills', /<div[^>]+class="unpaid-bill-item"[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/ig, [/У вас нет неоплаченных счетов/i, '0', balancesReplaces], parseBalance, aggregate_sum);

        AnyBalance.trace(xhtml);
        if(/информация[^<]*недоступна/i.test(xhtml))
            AnyBalance.trace('Информация временно недоступна на сайте Билайн, попробуйте позже');
    }

    if (!multi && AnyBalance.isAvailable('balance', 'currency')) {
        xhtml = refreshBalance(baseurl + 'c/post/index.xhtml', html);

        getParam(xhtml + html, result, 'balance', [/class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i,], balancesReplaces, parseBalance);
        getParam(xhtml + html, result, ['currency', 'balance'], [/class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i,], balancesReplaces, myParseCurrency);
    }

    if(prefs.__debug){
        //Проверяем, не создалась ли лишняя заявка в процессе просмотра личного кабинета
        html = AnyBalance.requestGet(baseurl + 'c/operations/operationsHistory.xhtml');
        var last_time = getParam(html, null, null, /<span[^>]+class="date"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        AnyBalance.trace('Последняя заявка: ' + last_time);
    }

    // Получение трафика из детализации
    var need_traffic = isAvailable('remainders.traffic_used') && (!isset(result.remainders) || !isset(result.remainders.traffic_used));

    if(phone && (need_traffic || isAvailable('detalization'))) {
        var num = getParam(phone, null, null, null, [/\+\s*7([\s\d\-]{10,})/i, '$1', /\D/g, '']);

        AnyBalance.trace('Пробуем получить данные по трафику из детализации по номеру: ' + num);
        html = AnyBalance.requestGet(baseurl + 'c/post/fininfo/report/detailUnbilledCalls.xhtml?ctn=' + num, g_headers);
        var upd = getBlockInner(baseurl + 'c/post/fininfo/report/detailUnbilledCalls.xhtml', html, 'retrieveSubCurPeriodDataDetails');
        xhtml = extractFromUpdate(upd, 'retrieveSubCurPeriodDataDetails');

        if(need_traffic){
            result.remainders = result.remainders || {};
            getParam(xhtml, result.remainders, 'remainders.traffic_used', /Итоговый объем данных \(MB\):([^>]*>){3}/i, [replaceTagsAndSpaces, /([\s\S]*?)/, '$1 мб'], parseTraffic);
        }

        //Получаем детализацию
        if(AnyBalance.isAvailable('detalization')){
            processDetalizationPost(baseurl, upd, result);
        }
    }

    if(isAvailable(['expenses', 'payments'])){
        html = AnyBalance.requestGet(baseurl + 'c/post/fininfo/index.xhtml', g_headers);
        if(AnyBalance.isAvailable('expenses'))
            processExpensesPost(baseurl, html, result);

        if(AnyBalance.isAvailable('payments'))
            processPaymentsPost(baseurl, html, result);
    }

    // Получение суммы по всем номерам
    if(isAvailable(['total_balance'])) {
        AnyBalance.trace('Пробуем получить данные по сумме всех номеров...');

        html = AnyBalance.requestGet(baseurl + 'c/post/fininfo/index.xhtml', g_headers);

        getParam(html, result, 'total_balance', /Сумма по всем номерам(?:[\s\S]*?<th[^>]*>){11}([\s\S]*?)<\/span/i, null, parseBalance);
    }

    processInfo_settings(baseurl, result);
}

function processInfoPre_basic(baseurl, html, result){
    if (AnyBalance.isAvailable('info.fio', 'info.region', 'info.phone', 'info.more3')) {
        if(!result.info)
            result.info = {};
        getParam(html, result.info, 'info.fio', /<p[^>]*>([^<,]*),(?:\s|&nbsp;|<[^>]*>)*Мы стремимся сделать/i, replaceTagsAndSpaces, html_entity_decode);

        processInfo_basic(baseurl, html, result);
    }
}

function processInfo_settings(baseurl, result){
    if(AnyBalance.isAvailable('info.email', 'info.address', 'info.birthday', 'info.fio')){
        var html = AnyBalance.requestGet(baseurl + 'c/settings/enrichment/enrichment.xhtml', g_headers);

        if(!result.info)
            result.info = {};
        var info = result.info;

        getParam(html, info, 'info.email', /Электронная почта[\s\S]*?<div[^>]+value-cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, info, 'info.address', /<div[^>]+class="[^"]*address[^>]*>([\s\S]*?)<\/div>/i, [/Адрес проживания/i, '', replaceTagsAndSpaces], html_entity_decode);

        var day = getElement(html, /<select[^>]+birthDay[^>]*>/i);
        var month = getElement(html, /<select[^>]+birthMonth[^>]*>/i);
        var year = getElement(html, /<select[^>]+yearPeriods[^>]*>/i);

        var join_space = create_aggregate_join(' ');
        sumParam(day, info, 'info.birthday', /<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i, [/день/i, '', replaceTagsAndSpaces], html_entity_decode, join_space);
        sumParam(month, info, 'info.birthday', /<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i, [/месяц/i, '', replaceTagsAndSpaces], html_entity_decode, join_space);
        sumParam(year, info, 'info.birthday', /<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i, [/год/i, '', replaceTagsAndSpaces], html_entity_decode, join_space);

        if(!isset(info.fio) || /^[\s\-\d\+]*$/.test(info.fio)){
            //Если фио не удалось получить, постараемся получить его из соц сетей
            getParam(html, info, 'info.fio', /<div[^>]+class="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        }
    }
}

function switchNumberPre(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    //Если задан номер, то надо сделать из него регулярное выражение
    if (!/^\d{4,10}$/.test(prefs.phone))
        throw new AnyBalance.Error('Введите от 4 до 10 последних цифр номера дополнительного телефона без пробелов и разделителей или не вводите ничего, чтобы получить информацию по первому номеру!', null, true);
    //   <div[^>]*(?:>)[^>]*onclick="\s*selectAccount\(['"]\d*4114['"][^>]*
    var re = new RegExp('div[^>]*(?:>)[^>]*onclick="\\s*selectAccount\\([\'\\"]\\d*' + prefs.phone + '[\'\\"][^>]*', 'i');
    var numinfo = getParam(html, null, null, re);
    if (!numinfo)
        throw new AnyBalance.Error('Не найден присоединенный к договору номер телефона, оканчивающийся на ' + prefs.phone);

    var num = getParam(numinfo, null, null, /selectAccount\('([^']*)/, replaceSlashes);
    if (/sso-account-current/i.test(numinfo))
        AnyBalance.trace('Дополнительный номер ' + num + ' уже выбран');
    else {
        AnyBalance.trace('Переключаемся на номер ' + num);
        var formid = getParam(html, null, null, /changeUser\s*=[^<]*?f:'([^']+)/, replaceSlashes);
        var source = getParam(html, null, null, /changeUser\s*=[^<]*?s:'([^']+)/, replaceSlashes);
        var form = getParam(html, null, null, new RegExp('<form[^>]+id="' + formid + '"[^>]*>([\\s\\S]*?)</form>', 'i'));
        if (!form) {
            AnyBalance.trace(numinfo);
            throw new AnyBalance.Error('Дополнительный номер ' + num + ' найден, но переключиться на него не удалось. Возможны изменения в личном кабинете...');
        }

        var fparams = createFormParams(form);
        params = joinObjects(fparams, {
            'javax.faces.partial.ajax': 'true',
            'javax.faces.source': source,
            'javax.faces.partial.execute': '@all',
            newSsoLogin: num
        });
        params[source] = source;

        var xhtml = AnyBalance.requestPost(baseurl + 'c/pre/index.xhtml', params, addHeaders({Referer: baseurl + 'c/pre/index.xhtml'}));
        var url = getParam(xhtml, null, null, /<redirect[^>]+url="([^"]+)/i, null, html_entity_decode);
        if (!url)
            AnyBalance.trace('Не удалось переключить номер: ' + xhtml);
        else
            html = AnyBalance.requestGet(url, addHeaders({Referer: baseurl + 'c/pre/index.xhtml'}));
    }
    return html;
}

function fetchPre(baseurl, html, result) {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.trace('Мы в предоплатном кабинете');

    if (prefs.phone) { //Если задан номер, то надо сделать из него регулярное выражение
        html = switchNumberPre(baseurl, html);
    }

    getParam('PREPAID', result, 'type');

    var phone = getParam(html, null, null, /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode), xhtml;
    processInfoPre_basic(baseurl, html, result);

    getParam(html, result, 'tariff', /Текущий тариф[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable('balance')) {
        // Если нет баланса, валюту не нужно получать
        function l_getCurrency() {
            if(isset(result.balance) && result.balance != null)
                getParam(html + xhtml, result, ['currency', 'balance'], balanceRegExp, replaceTagsAndSpaces, myParseCurrency);
        }
        // Пробуем получить со страницы, при обновлении через мобильный интернет, он там есть
        var balanceRegExp = /<h3>[^>]*class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i;
        getParam(html, result, 'balance', balanceRegExp, replaceTagsAndSpaces, parseBalance);
        l_getCurrency();

        if(!isset(result.balance) || result.balance == null) {
            // Теперь запросим блок homeBalance
            //xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'loadingBalanceBlock');
            xhtml = refreshBalance(baseurl + 'c/pre/index.xhtml', html);
            /*var tries = 0; //Почему-то не работает. Сколько раз ни пробовал, если первый раз баланс недоступен, то и остальные оказывается недоступен...
             while(/balance-not-found/i.test(xhtml) && tries < 20){
             AnyBalance.trace('Баланс временно недоступен, пробуем обновить: ' + (++tries));
             AnyBalance.sleep(2000);
             xhtml = refreshBalance(baseurl + 'c/pre/index.html', html, xhtml) || xhtml;
             } */
            // И получим баланс из него
            getParam(xhtml, result, 'balance', balanceRegExp, replaceTagsAndSpaces, parseBalance);
            l_getCurrency();
        }
    }
    if (isAvailableBonuses()) {
        xhtml = getBonusesBlock(baseurl + 'c/pre/index.xhtml', html, 'bonusesForm');
        AnyBalance.trace(xhtml);
        // Затем надо пнуть систему, чтобы точно получить все бонусы
        //xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'refreshButton');
        getBonuses(xhtml, result);
    }

    if(AnyBalance.isAvailable('detalization', 'payments', 'info.date_start')){
        processDetailsAndPaymentsPre(baseurl, phone, result);
    }

    processInfo_settings(baseurl, result);
}

function isAvailableBonuses() {
    return AnyBalance.isAvailable('remainders');
}

function getFoundBonuses(xhtml) {
    var bonuses = sumParam(xhtml, null, null, /<div[^>]+class="item(?:[\s\S](?!$|<div[^>]+class="item))*[\s\S]/ig);
    return bonuses;
}

function getBonuses(xhtml, result, nopath) {
    var bonuses = getFoundBonuses(xhtml);

    var remainders, path;
    if(nopath){
    	//Для старых провайдеров
        remainders = result;
        path = '';
    }else{
    	//для новых провайдеров
    	remainders = result.remainders = result.remainders || {};
    	path = 'remainders.';
    }

    AnyBalance.trace("Found " + bonuses.length + ' aggregated bonuses');
    path = path || '';

    if(bonuses.length == 0) {
        AnyBalance.trace('Can`t find bonuses, tying to know why...');
        AnyBalance.trace(getParam(xhtml, null, null, /loading-failed"[^>]*>([^<]+)/i));
    }
    for (var j = 0; j < bonuses.length; ++j) {
        var bonus = bonuses[j];
        //var bonus_name = ''; //getParam(bonus, null, null, /<span[^>]+class="bonuses-accums-list"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        // var services = sumParam(bonus, null, null, /<div[^>]+class="\s*(?:accumulator|bonus|item)\s*"(?:[\s\S](?!$|<div[^>]+class="(?:accumulator|bonus|item)"))*[\s\S]/ig);
        var services = sumParam(bonus, null, null, /<div[^>]+class="\s*(?:(?:item\s*)?(?:accumulator|accumulator|bonus|item)?)[^"]*"(?:[\s\S](?!$|<div[^>]+class="(?:accumulator|accumulator|bonus|item)"))*[\s\S]/ig);

        AnyBalance.trace("Found " + services.length + ' bonuses');
        var reValue = /<div[^>]+class="[^>]*column2[^"]*"[^>]*>/i;
        var replaceMinutes = [replaceTagsAndSpaces, /из.*/i, ''];

        for (var i = 0; i < services.length; ++i) {
            var name = '' + getParam(services[i], null, null, /<div[^>]+class="[^"]*column1[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode); //+ ' ' + bonus_name;
            var values = getElement(services[i], reValue, replaceTagsAndSpaces, html_entity_decode);
            var rest = getParam(services[i], null, null, /class="[^>]*rest"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            AnyBalance.trace('Найдена опция ' + name + ': ' + values + ', rest: ' + rest);

            if (/Internet|Интернет|трафика/i.test(name)) {
                // Для опции Хайвей все отличается..
                // В билайне опечатались, первая буква иногда из русского алфавита, иногда из английского :)
                if (/(?:x|х)айвей|Интернет-трафик(?:а)?(?:\sна полной скорости)? по (?:услуге|тарифу)|Мобильного интернета|Мобильный интернет|Интернет\s*-?\s*трафик/i.test(name)) {
                    AnyBalance.trace('Пробуем разобрать новый трафик...');
                    AnyBalance.trace('services[i] = ' + services[i]);
                    AnyBalance.trace('values = ' + values);
                    AnyBalance.trace('rest = ' + rest);

                    var units = getParam(values, null, null, /((?:K|К|G|Г|M|М)?(?:B|Б))/i);
                    if(!units) {
                        AnyBalance.trace('!units...');
                        units = 'mb';
                    }
                    function parseTrafficMy(str) {
                        return parseTraffic(str, units);
                    }
                    // Новое отображение пакета трафика
                    if(rest) {
                        sumParam(rest, remainders, path + 'traffic_left', null, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
                    } else {
                        sumParam(values, remainders, [path + 'traffic_left', path + 'traffic_used'], /([^<]*)из/i, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
                        sumParam(values, remainders, [path + 'traffic_total', path + 'traffic_used'], /из([^<]*)/i, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
                        if(isset(remainders.traffic_left) && isset(remainders.traffic_total)) {
                            sumParam(remainders.traffic_total - remainders.traffic_left, remainders, path + 'traffic_used', null, null, null, aggregate_sum);
                        }
                    }
                } else {
                    sumParam(values, remainders, path + 'traffic_left' + (/ноч/i.test(name) ? '_night' : ''), null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
                }
            } else if (/SMS|СМС|штук/i.test(name)) {
                sumParam(values, remainders, path + 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            } else if (/MMS/i.test(name)) {
                sumParam(values, remainders, path + 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            } else if (/Рублей БОНУС|бонус-баланс|Дополнительный баланс/i.test(name)) {
                sumParam(values, remainders, path + 'rub_bonus', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            } else if (/Денежный бонус/i.test(name)) {
                getParam(values, remainders, path + 'rub_bonus2', null, replaceTagsAndSpaces, parseBalance);
                getParam(services[i], remainders, path + 'rub_bonus2_till', /<div[^>]+class="column3[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateWord);
            } else if (/Рублей за участие в опросе|Счастливое время|Бонусы по программе|Счастливого времени/i.test(name)) {
                sumParam(values, remainders, path + 'rub_opros', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            } else if (/Минут[^<]+на номера вашего региона|Времени общения|Включенные минуты|Минут общения на номера вашего региона|минут в месяц|мин\.|Голосовой трафик|Разговор.*вне сети/i.test(name)) {
                sumParam(values, remainders, path + 'min_local', null, replaceMinutes, parseMinutes, aggregate_sum);
                sumParam(services[i], remainders, path + 'min_local_till', /Доступно до([^<]{10,20})/i, replaceTagsAndSpaces, parseDateWord, aggregate_min);

            } else if (/Секунд БОНУС\s*\+|Баланс бонус-секунд/i.test(name)) {
                sumParam(values, remainders, path + 'min_bi', null, replaceMinutes, parseMinutes, aggregate_sum);
            } else if (/Секунд БОНУС-2|Баланс бесплатных секунд-промо/i.test(name)) {
                sumParam(values, remainders, path + 'min_left_1', null, replaceMinutes, parseMinutes, aggregate_sum);
                sumParam(services[i], remainders, path + 'min_local_till', /Доступно до([^<]{10,20})/i, replaceTagsAndSpaces, parseDateWord, aggregate_min);
                // Это новый вид отображения данных
            } else if (/Минут общения по (?:тарифу|услуге)|вызовы|на местные номера/i.test(name)) {
                // Очень внимательно надо матчить
                if(/любые номера Вашего региона|^Минут общения по тарифу$|других (?:сотовых\s+)?операторов|все номера|На номера домашнего региона|Минут общения по тарифу Все для бизнеса Бронза|кроме номеров "Билайн"|на местные номера других операторов/i.test(name))
                    sumParam(values, remainders, path + 'min_local', null, replaceMinutes, parseMinutes, aggregate_sum);
                else
                    sumParam(values, remainders, path + 'min_bi', null, replaceMinutes, parseMinutes, aggregate_sum);
                /*if(/на номера.+Билайн.+$/i.test(name))
                 sumParam(services[i], remainders, path + 'min_bi', reNewValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                 else
                 // Минут осталось на всех операторов
                 sumParam(services[i], remainders, path + 'min_local', reNewValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);*/
                // TODO пока не работает, но может понадобится
            } else if (/Баланс для оплаты дополнительных услуг/i.test(name)) {

            } else {
                AnyBalance.trace('Неизвестная опция: ' + name + ' ' + services[i]);
            }
        }
    }
}

function getTempPasswordSMS(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    var url = baseurl + 's/recoveryPassSSO.xhtml';
    var viewState;

    do{
        var form = getParam(html, null, null, /<form[^>]+id="form"[^>]*>[\s\S]*?<\/form>/i);
        if(!form){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удаётся найти форму регистрации. Проблемы на сайте или сайт изменен');
        }

        var kaptchaUrl;
        var params = createFormParams(form, function (params, input, name, value) {
            if (/login/i.test(name)){
                value = prefs.login;
            }else if(name == 'kaptchaId'){
                var cinfo = AnyBalance.requestPost(baseurl + 'captcha.jpg', '', addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: url}));
                var json = getJson(cinfo);
                kaptchaUrl = json.url;
                value = json.id;
            }else if(/kaptchaInput/i.test(name)){
                var cError = getParam(form, null, null, /<div[^>]+ui-message-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
                var img = AnyBalance.requestGet(baseurl + kaptchaUrl, g_headers);
                var code = AnyBalance.retrieveCode((cError || '') + '\nВведите, пожалуйста, символы с картинки.', img, {time: 300000});
                value = code;
            }
            return value;
        });

        var button = getParam(form, null, null, /<button[^>]+loginInnerBlock[^>]*>/i);
        if(!button){
            AnyBalance.trace(form);
            throw new AnyBalance.Error('Не удаётся найти кнопку подтверждения регистрации. Проблемы на сайте или сайт изменен');
        }
        var formId = getParam(button, null, null, /name="([^"]*)/i, null, html_entity_decode);

        params['javax.faces.partial.ajax'] = 'true';
        params['javax.faces.source'] = formId;
        params['javax.faces.partial.execute'] = '@all';
        params['javax.faces.partial.render'] = 'loginInnerBlock';
        params[formId] = formId;
        if(viewState)
            params['javax.faces.ViewState'] = viewState;

        var output = AnyBalance.requestPost(url, params, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
        viewState = extractFromUpdate(output, 'ViewState:0');
        html = extractFromUpdate(output, 'loginInnerBlock', true);
    }while(/kaptchaInput/i.test(html));
    return output;
}

function createNewPassword(baseurl){
	var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите 10 цифр вашего номера телефона в формате 9031234567');
    checkEmpty(!prefs.password || prefs.password.length >= 6, 'Введите не менее 6 символов желаемого пароля. Или оставьте поле пустым, чтобы автоматически сгенерировать пароль.');

    var url = baseurl + 's/recoveryPassSSO.xhtml';
    var urlPass = baseurl + 's/changePassSSO.xhtml';

    //Вводим свой номер
    var html = AnyBalance.requestGet(baseurl + 's/recoveryPassSSO.xhtml', g_headers);
    var output = getTempPasswordSMS(baseurl, html);
    var viewState = extractFromUpdate(output, 'ViewState:0');
    html = extractFromUpdate(output, 'loginInnerBlock', true);

    //Вводим смс
    var form = getParam(html, null, null, /<form[^>]+id="tokenForm"[^>]*>[\s\S]*?<\/form>/i);
    if(!form){
        var error = getParam(html, null, null, /<div[^>]*ui-message-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти форму ввода смс пароля. Проблемы на сайте или сайт изменен');
    }

    var params = createFormParams(form, function (params, input, name, value) {
        if (/smsToken/i.test(name))
            value = AnyBalance.retrieveCode('Введите временный пароль, который пришел на номер ' + prefs.login + ' по SMS <!--#instruction:{"sms":{"number_in":"My Beeline","regexp_in":"Временный пароль:\\s*(\\w+)"}}#-->', null, {time: 300000});
        return value;
    });

    var button = getParam(form, null, null, /<button[^>]+loginInnerBlock[^>]*>/i);
    if(!button){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удаётся найти кнопку подтверждения ввода SMS кода. Проблемы на сайте или сайт изменен');
    }
    var formId = getParam(button, null, null, /name="([^"]*)/i, null, html_entity_decode);

    params['javax.faces.partial.ajax'] = 'true';
    params['javax.faces.source'] = formId;
    params['javax.faces.partial.execute'] = '@all';
    params['javax.faces.partial.render'] = 'loginInnerBlock';
    params[formId] = formId;
    params['javax.faces.ViewState'] = viewState;

    html = AnyBalance.requestPost(url, params, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
    var go_to = getParam(html, null, null, /<redirect[^>]+url="([^"]*)/i, null, html_entity_decode);
    if(!go_to){
    	var error = getElement(html, /<div[^>]+ui-messages-error[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    	if(error)
    		throw new AnyBalance.Error(error);
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удаётся найти адрес входа в личный кабинет. Сайт изменен?');
    }

    //Меняем пароль на постоянный
    html = AnyBalance.requestGet(go_to, g_headers);
    var pass = prefs.password || generatePassword();

    var form = getParam(html, null, null, /<form[^>]+id="changePassWordForm"[^>]*>[\s\S]*?<\/form>/i);
    if(!form){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти форму смены пароля. Проблемы на сайте или сайт изменен');
    }

    var params = createFormParams(form, function (params, input, name, value) {
        if (/password$/i.test(name))
            value = pass;
        return value;
    });

    var urlPass = AnyBalance.getLastUrl();
    html = AnyBalance.requestPost(urlPass, params, addHeaders({}));

    //Подтверждаем и переходим в ЛК
    var form = getParam(html, null, null, /<form[^>]+id="confirmForm"[^>]*>[\s\S]*?<\/form>/i);
    if(!form){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти форму подтверждения инициализации. Проблемы на сайте или сайт изменен');
    }

    var params = createFormParams(form);

    var urlConfirm = AnyBalance.getLastUrl();
    html = AnyBalance.requestPost(urlConfirm, params, addHeaders({}));
    //И вот здесь мы уже в кабинете.
    //Отключаем смс-уведомление о входе
    try{
        turnOffSMSNotification(baseurl); //Чтобы не мешались
    }catch(e){
        AnyBalance.trace('Проблема с отключением уведомления: ' + e.message);
    }

    return pass;
}

function loginWithoutPassword(baseurl){
    var pass = createNewPassword(baseurl);

    var html = AnyBalance.requestGet(baseurl, g_headers); //Заново получим главную страницу кабинета.

    var result = getLKType(html);
    result.password = pass;

    return result;
}

function turnOffSMSNotification(baseurl){
    var url = baseurl + 'c/settings/notifications/notifications.xhtml';
    var html = AnyBalance.requestGet(url, g_headers);

    var form = getParam(html, null, null, /<form[^>]+name="notificationEventsForm"[^>]*>[\s\S]*?<\/form>/i);
    if(!form){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму управления уведомлениями.');
    }

    var checkbox = getParam(form, null, null, /(<input[^>]+id="notificationEventsForm:[^>]*Вход в личный кабинет[^>]*>)/i, null, html_entity_decode);
    if(!checkbox){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти галочку отключения уведомления.');
    }

    var chk_name = getParam(checkbox, null, null, /name="([^"]*)/i, null, html_entity_decode);
    var checked = getParam(checkbox, null, null, /\s+checked=/i, null, html_entity_decode);
    if(!checked){
        AnyBalance.trace('Уведомление о входе уже выключено. Отлично :)');
        return;
    }

    var params = createFormParams(form, function (params, input, name, value) {
        if (name == chk_name)
            value = undefined;
        return value;
    });

    var button = getParam(form, null, null, /<button[^>]*u:'notificationEventsForm'[^>]*>/i);
    if(!button){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти кнопку сохранения уведомлений.');
    }

    var source = getParam(button, null, null, /s:'([^']*)/, null, html_entity_decode);
    params['javax.faces.partial.ajax'] = 'true';
    params['javax.faces.source'] = source;
    params['javax.faces.partial.execute'] = '@all';
    params['javax.faces.partial.render'] = 'notificationEventsForm';
    params[source] = source;

    html = AnyBalance.requestPost(url, params, g_headers);
    html = extractFromUpdate(html, 'notificationEventsForm', true);
    if(!/Настройки уведомлений успешно сохранены/i.test(html)){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось сохранить уведомления');
    }

    AnyBalance.trace('Уведомление о входе отменено успешно!');
}

function generatePassword(){
    var pass = String.fromCharCode("A".charCodeAt() + Math.floor(Math.random()*26));
    pass += String.fromCharCode("0".charCodeAt() + Math.floor(Math.random()*10));
    for(var i=0; i<4; ++i){
        pass += String.fromCharCode("a".charCodeAt() + Math.floor(Math.random()*26));
    }
    return pass;
}

function sheet_to_array(sheet){
    var out = [];
    if(sheet == null || sheet["!ref"] == null) return out;
    var r = XLS.utils.decode_range(sheet["!ref"]);
    var row, rr = "", cols = [];
    var i = 0, cc = 0, val;
    var R = 0, C = 0;
    for(C = r.s.c; C <= r.e.c; ++C) cols[C] = XLS.utils.encode_col(C);
    for(R = r.s.r; R <= r.e.r; ++R) {
        row = [];
        rr = XLS.utils.encode_row(R);
        for(C = r.s.c; C <= r.e.c; ++C) {
            val = sheet[cols[C] + rr];
            val = val !== undefined ? ''+XLS.utils.format_cell(val) : "";
            row[C] = val;
        }
        out.push(row);
    }
    return out;
}

