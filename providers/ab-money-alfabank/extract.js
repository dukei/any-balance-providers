/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_baseurl = 'https://click.alfabank.ru';

var g_headers = [
    ['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'],
    ['Accept-Language', 'ru,en-US;q=0.8,en;q=0.6'],
    ['Connection', 'keep-alive'],
    ['User-Agent', 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36']
//	['Origin', null], //Падает пейстор на этом
//	['Cookie2', '$Version=1']
];

var g_some_action = '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>';
var g_mainHtml;
var g_csrfToken;
var g_pageID;

function login(options) {
    AnyBalance.setOptions({cookiePolicy: 'rfc2109'});
    AnyBalance.setDefaultCharset('utf-8');

    var prefs = AnyBalance.getPreferences();

    if(!g_mainHtml) {
        checkEmpty(prefs.login, 'Введите логин!');
        checkEmpty(prefs.password, 'Введите пароль!');

        return processClick(options);
    }else{
        return g_mainHtml;
    }
}

var g_mainHtmlIs20;
function isClick20() {
    if(!isset(g_mainHtmlIs20))
        g_mainHtmlIs20 = /\(C2skin\)/.test(g_mainHtml);
    return g_mainHtmlIs20;
}

function processClick(options) {
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestGet(g_baseurl + '/ALFAIBSR/', g_headers);

    html = AnyBalance.requestPost(g_baseurl + '/AlfaSign/security', {
        username: prefs.login,
        password: prefs.password.substr(0, 16)
    }, g_headers);

    html = AnyBalance.requestPost(g_baseurl + '/oam/server/auth_cred_submit', {
        username: prefs.login,
        password: prefs.password.substr(0, 16)
    }, g_headers);

    if (!/"_afrLoop",\s*"(\d+)"/i.test(html)) {
        //Мы остались на странице входа. какая-то ошибка
        var error = getParam(html, null, null, /<div[^>]+class="[^"]*\bred"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        error = getParam(html, null, null, /(Неверный логин или пароль)/i);
        if (error)
            throw new AnyBalance.Error(error, null, true);
        var error_code = getParam(AnyBalance.getLastUrl(), null, null, /p_error_code=([^&]*)/i, null, decodeURIComponent);
        if (error_code) {
            var jsons = AnyBalance.requestGet(g_baseurl + '/SLAlfaSignFront10/errors?code=' + error_code + '&type=' + getParam(error_code, null, null, /[^\-]*/), g_headers);
            var json = getJson(jsons);
            if (json.result != 'SUCCESS') {
                AnyBalance.trace('Не удалось получить ошибку: ' + jsons);
            } else {
                error = json.payload[error_code];
            }
            if (error)
                throw new AnyBalance.Error(error, null, /логин или пароль/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    html = clickGoToUrl(html, {isHtml: true, sessionRequired: true});
    var lastUrl = AnyBalance.getLastUrl();

    if (/faces\/main\/changePassword|faces\/routeChangePwd\/changePassword/i.test(html)) {
        throw new AnyBalance.Error("Вам необходимо сменить старый пароль. Зайдите в Альфа-Клик через браузер, поменяйте пароль, затем введите новый пароль в настройки провайдера.", null, true);
    }

    function getClickOTP(params, str, name, value) {
        if (name == 'pt1:password_key')
            return AnyBalance.retrieveCode("Вам на мобильный телефон выслан одноразовый пароль на вход в Альфа-Клик. Введите его в поле ниже.\n\nВы можете отключить требование пароля на вход в интернет-банк в настройках Альфа-Клик. Это безопасно, отменяет только подтверждение входа. Подтверждение транзакций всё равно будет требоваться обязательно.", null, {
                    time: 180000, //Время ожидания ввода кода в мс (3 минуты)
                    inputType: 'number' //Способ ввода (только цифры
                });
        return value;
    }

    if(/pt1:password_key/i.test(html)){
        var windowName = getParam(html, null, null, /window.name='([^']*)/i, replaceSlashes) || null;

        //надо ввести код для смс
        var o = getNextPage(html, 'pt1:next_button', [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ], {paramsFunc: getClickOTP, withScripts: true});
        html = o.html;

        if(html) {
            error = getParam(o.scripts, null, null, /AdfFacesMessage.TYPE_ERROR,[^,]*,('[^']*')/i, [/^/, 'return '], safeEval);
            if (error)
                throw new AnyBalance.Error(error);
            AnyBalance.trace(html + o.scripts);
            AnyBalance.trace('Не удалось зайти в Альфа-Клик после ввода одноразового пароля. Попробуйте отключить запрос одноразового пароля в настройках своего Альфа-Клик.')
        }

        html = clickGoToUrl(lastUrl.replace(/_afrWindowId=null/, '_afrWindowId=' + windowName));
    }

    if(!/images\/close.png/i.test(html) //Click 2.0
    	 && !/&#1042;&#1099;&#1093;&#1086;&#1076;/i.test(html) //Click 1.0
    	 ){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в Альфа-Клик. Сайт изменен?');
    }

    g_mainHtml = html;

    if (isClick20()) {  //Альфаклик 2.0
        AnyBalance.trace("Определен Альфа-Клик 2.0");
    } else {
        AnyBalance.trace("Определен Альфа-Клик 1.0");
        if(!options || !options.allowClick10)
            throw new AnyBalance.Error('К сожалению, Альфа-Клик 1.0 не поддерживается. Зайдите в Альфа-Клик через браузер и переключите ваш Альфа-Клик на версию 2.0');
    }

    __setLoginSuccessful();

    return html;
}

function clickGoToUrl(urlOrHtml, options){
    if(!options)
        options = {};

    var html = options.isHtml ? urlOrHtml : AnyBalance.requestGet(urlOrHtml, g_headers);

    var afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
    if (!afr)
        throw new AnyBalance.Error('Не удаётся найти параметр для входа: _afrLoop. Сайт изменен?');

    var sess = getParam(html, null, null, /var\s+sess\s*=\s*"([^"]*)/i, replaceSlashes);
    if (options.sessionRequired && !sess)
        throw new AnyBalance.Error('Не удаётся найти параметр для входа: sess. Сайт изменен?');

    html = AnyBalance.requestGet(g_baseurl + '/ALFAIBSR/' + sess + '?_afrLoop=' + afr + '&_afrWindowMode=0&_afrWindowId=null', g_headers);
    var ct = getParam(html, null, null, /<div[^>]+id="ct"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.trace('CSRF token found: ' + ct);
    g_csrfToken = ct;

    var url = getParam(html, null, null, /location\.href\s*=\s*'(\/ALFA[^']*)/, replaceSlashes);

    html = AnyBalance.requestGet(g_baseurl + url, g_headers);

    afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
    if (!afr)
        throw new AnyBalance.Error('Не удаётся найти очередной параметр для входа: _afrLoop. Сайт изменен?');

    html = AnyBalance.requestGet(g_baseurl + url + '&_afrLoop=' + afr + '&_afrWindowMode=0&_afrWindowId=null', g_headers);
    return html;
}

function processCards2(html, result) {
    if (!AnyBalance.isAvailable('cards'))
        return;

    AnyBalance.trace('Получаем информацию о картах');

    html = getMainPageOrModule2(html, 'card');

    var rows = getElements(html, [/<div[^>]+class="[^"]*AFFlow[^>]*>/ig, /c2_cardlist_Card/i]);
    if (!rows.length) {
        if (/Удобство пластиковых карт:/i.test(html)) {
            AnyBalance.trace('Нет ни одной карты');
        } else {
            AnyBalance.trace('Не удалось найти карты\n' + html);
            return;
        }
    }

    result.cards = [];

    AnyBalance.trace('Найдено карт: ' + rows.length);
    for (var i = 0; i < rows.length; ++i) {
        var row = rows[i];
        var id = getParam(row, null, null, /<a[^>]+c2_cardlist_Card[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
        var name = getParam(row, null, null, /<a[^>]+style="[^"]*display:\s*inline;[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

        var c = {
            __id: id,
            __name: name + ' (' + id + ')'
        };

        if (__shouldProcess('cards', c)) {
            processCard2(html, row, c);
        }

        result.cards.push(c);
    }
}

function processCard2(html, row, result) {
    var event = getParam(row, null, null, /<a[^>]+id="([^"]*)"[^>]*c2_cardlist_Card/i, null, html_entity_decode);
    html = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PPR_FORCED', 'true']
    ]);

    //Баланс счета
    getParam(html, result, 'cards.balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089; &#1089;&#1095;&#(?:1077|1105);&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['cards.currency', 'cards.balance', 'cards.topay', 'cards.debt', 'cards.minpay', 'cards.penalty', 'cards.late', 'cards.overdraft', 'cards.limit'],
        /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089; &#1089;&#1095;&#1077;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    //Срок действия
    getParam(html, result, 'cards.till', /&#1057;&#1088;&#1086;&#1082; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    //Номер
    getParam(html, result, 'cards.num', /&#1053;&#1086;&#1084;&#1077;&#1088;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Тип
    getParam(html, result, ['cards.type', 'cards.credit'], /&#1058;&#1080;&#1087;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(AnyBalance.isAvailable('cards.credit'))
        result.credit = /кредитн/i.test('' + result.type);
    //Название счета
    getParam(html, result, 'cards.acctype', /&#1053;&#1072;&#1079;&#1074;&#1072;&#1085;&#1080;; &#1089;&#1095;&#(?:1077|1105);&#1090;&#1072;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Рады вас видеть
    getParam(html, result, 'cards.userName', /&#1056;&#1072;&#1076;&#1099; &#1042;&#1072;&#1089; &#1074;&#1080;&#1076;&#1077;&#1090;&#1100;,([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);
    //Статус
    getParam(html, result, 'cards.status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Номер счета
    getParam(html, result, 'cards.accnum', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1089;&#1095;&#(?:1077|1105);&#1090;&#1072;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable('cards.transactions')) {
        processCardTransactions(html, result);
    }
}

function processCardTransactions(html, result) {
    AnyBalance.trace('Получаем транзакции для карты ' + result.__name);

    function setSwitchTo3(params, str, name, value) {
        if (name == 'pt1:periodSwitch')
            return "3"; //Квартал
        /*if(name == 'pt1:id1') { // Из формы будем получать
         var dt = new Date(), dtFrom = new Date(dt.getFullYear()-2, dt.getMonth(), dt.getDate());
         return n2(dtFrom.getDate()) + '.' + n2(dtFrom.getMonth() + 1) + '.' + dtFrom.getFullYear();
         }*/
        return value;
    }

    //Показать подробную выписку
    var event = getParam(html, null, null, /<a[^>]+id="([^"]*)[^>]*>\s*&#1055;&#1086;&#1082;&#1072;&#1079;&#1072;&#1090;&#1100; &#1087;&#1086;&#1076;&#1088;&#1086;&#1073;&#1085;&#1091;&#1102; &#1074;&#1099;&#1087;&#1080;&#1089;&#1082;&#1091;/i);
    html = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PPR_FORCED', 'true']
    ]);

    html = getNextPage(html, 'pt1:periodSwitch', [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action]
    ], {paramsFunc: setSwitchTo3});

    html = getNextPage(html, 'pt1:show', [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action]
    ], {paramsFunc: setSwitchTo3});

    event = getParam(html, null, null, /<a[^>]+id="([^"]*)[^>]+title="csv"/i, null, html_entity_decode);
    if (!event) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти ссылку на загрузку csv для карты ' + result.__name);
        return;
    }

    html = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PROCESS', '%EVENT%']
    ], {paramsFunc: setSwitchTo3, headers: {}, requestOptions: {FORCE_CHARSET: 'windows-1251'}});

    var data = Papa.parse(html);

    AnyBalance.trace('Для карты ' + result.__name + ' получено ' + data.data.length + ' транзакций: ' + data.data[0].join(';'));
    var cols = {};
    for (var j = 0; j < data.data[0].length; ++j) {
        var col = data.data[0][j];
        if (col == 'Валюта')
            cols.currency = j;
        else if (col == 'Дата')
            cols.date = j;
        else if (col == 'Референс')
            cols.id = j;
        else if (col == 'Примечание')
            cols.descr = j;
        else if (col == 'Приход')
            cols.debit = j;
        else if (col == 'Расход')
            cols.credit = j;
    }

    result.transactions = [];

    for (j = 1; j < data.data.length; ++j) {
        var d = data.data[j], t = {};
        if (d.length >= 6) {
            if (isset(cols.descr) && /Предоставление транша\s+Дог/i.test(d[cols.descr]))
                continue; //Предоставление транша неинтересно
            if (isset(cols.date))
                getParam(d[cols.date], t, 'cards.transactions.date', null, null, parseDate);
            if (isset(cols.currency))
                getParam(d[cols.currency], t, 'cards.transactions.currency');
            if (isset(cols.descr))
                getParam(d[cols.descr], t, 'cards.transactions.descr');
            if (isset(cols.debit))
                sumParam(d[cols.debit], t, 'cards.transactions.sum', null, null, parseBalance, aggregate_sum);
            if (isset(cols.credit))
                sumParam(d[cols.credit], t, 'cards.transactions.sum', null, null, function (str) {
                    var val = parseBalance(str);
                    return val && -val
                }, aggregate_sum);
            if (isset(cols.ref))
                sumParam(d[cols.ref], t, 'cards.transactions.ref');

            result.transactions.push(t);
        }
    }
}

function processAccounts2(html, result) {
    if (!AnyBalance.isAvailable('accounts'))
        return;

    AnyBalance.trace('Получаем информацию о счетах');

    html = getMainPageOrModule2(html, 'acc');

    var rows = getElements(html, /<table[^>]+class="accounts_table"[^>]*>/ig);
    if (!rows.length) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти ни одного счета');
        return;
    }
    AnyBalance.trace('Найдено счетов: ' + rows.length);

    result.accounts = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var id = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        var name = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

        var a = {
            __id: id,
            __name: name + ' (' + id.substr(-4) + ')'
        };

        if (__shouldProcess('accounts', a)) {
            processAccount2(html, row, a);
        }

        result.accounts.push(a);
    }
}

function n2(n) {
    return n < 10 ? '0' + n : '' + n;
}

function processAccount2(html, row, result) {
    //Рады вас видеть
    //getParam(html, result, 'userName', /&#1056;&#1072;&#1076;&#1099; &#1042;&#1072;&#1089; &#1074;&#1080;&#1076;&#1077;&#1090;&#1100;,([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);
    var tds = getElements(row, /<td[^>]*>/ig);
    getParam(tds[4], result, ['accounts.currency', 'accounts.balance'], null, replaceTagsAndSpaces, html_entity_decode);
    getParam(tds[3], result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(tds[0], result, 'accounts.type', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(tds[1], result, 'accounts.num', null, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable('accounts.dateStart', 'accounts.transactions', 'accounts.own', 'accounts.limit', 'accounts.blocked')) {
        var event = getParam(tds[0], null, null, /<a[^>]+id="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
        html = getNextPage(html, event, [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ]);

        //Текущий баланс
        getParam(html, result, 'accounts.own', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Овердрафт
        getParam(html, result, 'accounts.limit', /&#1054;&#1074;&#1077;&#1088;&#1076;&#1088;&#1072;&#1092;&#1090;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Дата открытия счета
        getParam(html, result, 'accounts.dateStart', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1090;&#1082;&#1088;&#1099;&#1090;&#1080;&#1103; &#1089;&#1095;&#1105;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        //Заблокировано средств
        getParam(html, result, 'accounts.blocked', /&#1047;&#1072;&#1073;&#1083;&#1086;&#1082;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1086; &#1089;&#1088;&#1077;&#1076;&#1089;&#1090;&#1074;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

        if (AnyBalance.isAvailable('accounts.transactions')) {
            processAccountTransactions(html, result);
        }
    }
}

function processAccountTransactions(html, result) {
    AnyBalance.trace('Получаем транзакции для счета ' + result.__name);

    function setSwitchTo5(params, str, name, value) {
        if (name == 'pt1:periodSwitch')
            return "5"; //Джва года
        /*if(name == 'pt1:id1') { // Из формы будем получать
         var dt = new Date(), dtFrom = new Date(dt.getFullYear()-2, dt.getMonth(), dt.getDate());
         return n2(dtFrom.getDate()) + '.' + n2(dtFrom.getMonth() + 1) + '.' + dtFrom.getFullYear();
         }*/
        return value;
    }

    //Показать подробную выписку
    var event = getParam(html, null, null, /<a[^>]+id="([^"]*)[^>]*>\s*&#1055;&#1086;&#1082;&#1072;&#1079;&#1072;&#1090;&#1100; &#1087;&#1086;&#1076;&#1088;&#1086;&#1073;&#1085;&#1091;&#1102; &#1074;&#1099;&#1087;&#1080;&#1089;&#1082;&#1091;/i);
    html = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PPR_FORCED', 'true']
    ]);

    html = getNextPage(html, 'pt1:periodSwitch', [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action]
    ], {paramsFunc: setSwitchTo5});
    /*
     html = getNextPage(html, 'pt1:showButton', [
     ['event', '%EVENT%'],
     ['event.%EVENT%', g_some_action]
     ], {paramsFunc: setSwitchTo5});

     html = getNextPage(html, 'pt1:downloadCSVLinkBottom', [
     ['event', '%EVENT%'],
     ['event.%EVENT%', g_some_action]
     ], {paramsFunc: setSwitchTo5});
     */
    html = getNextPage(html, 'pt1:HiddenBtn', [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PROCESS', '%EVENT%']
    ], {paramsFunc: setSwitchTo5, headers: {}, requestOptions: {FORCE_CHARSET: 'windows-1251'}});

    var data = Papa.parse(html);
    AnyBalance.trace('Для счета ' + result.__name + ' получено ' + data.data.length + ' транзакций: ' + data.data[0].join(';'));

    var cols = {};
    for (var j = 0; j < data.data[0].length; ++j) {
        var col = data.data[0][j];
        if (col == 'Валюта')
            cols.currency = j;
        else if (col == 'Дата операции')
            cols.date = j;
        else if (col == 'Референс проводки')
            cols.ref = j;
        else if (col == 'Описание операции')
            cols.descr = j;
        else if (col == 'Приход')
            cols.debit = j;
        else if (col == 'Расход')
            cols.credit = j;
    }

    result.transactions = [];

    var transhes = 0;

    for (j = 1; j < data.data.length; ++j) {
        var d = data.data[j], t = {};
        if (d.length >= 6) {
            if (isset(cols.descr) && /Предоставление транша\s+Дог/i.test(d[cols.descr])) {
                ++transhes;
                continue; //Предоставление транша неинтересно
            }
            if (isset(cols.date))
                getParam(d[cols.date], t, 'accounts.transactions.date', null, null, parseDate);
            if (isset(cols.currency))
                getParam(d[cols.currency], t, 'accounts.transactions.currency');
            if (isset(cols.descr))
                getParam(d[cols.descr], t, 'accounts.transactions.descr');
            if (isset(cols.debit))
                sumParam(d[cols.debit], t, 'accounts.transactions.sum', null, null, parseBalance, aggregate_sum);
            if (isset(cols.credit))
                sumParam(d[cols.credit], t, 'accounts.transactions.sum', null, null, function (str) {
                    var val = parseBalance(str);
                    return val && -val
                }, aggregate_sum);
            if (isset(cols.ref))
                sumParam(d[cols.ref], t, 'accounts.transactions.ref');

            result.transactions.push(t);
        }
    }

    if (transhes)
        AnyBalance.trace('Вырезано ' + transhes + ' тразакций "Предоставление транша"');
}


function createParams(params, event) {
    var ret = {};
    for (var i = 0; i < params.length; ++i) {
        if (!params[i]) continue;
        ret[params[i][0].replace(/%EVENT%/g, event)] = params[i][1].replace(/%EVENT%/g, event);
    }
    return ret;
}

function getMainPageOrModule2(html, type) {
    var commands = {
        card: 'pt1:menu:ATP2_r1:0:i1:1:cl2',
        acc: 'pt1:menu:ATP2_r1:0:i1:0:cl2',
        dep: 'pt1:menu:ATP2_r1:0:i1:3:cl2',
        crd: 'pt1:menu:ATP2_r1:0:i1:2:cl2',
        providers: 'pt1:menu:ATP2_r1:0:i1:6:cl2'
    };

    var event = commands[type] ? commands[type] : type;

    return getNextPage(html, event, [
        ['oracle.adf.view.rich.RENDER', 'pt1:menu:ATP2_r1'],
        ['oracle.adf.view.rich.DELTAS', '{pt1:menu:ATP2_r1:0:i1:3:p1={_shown=}}'],
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PROCESS', 'pt1:menu:ATP2_r1']
    ]);
}

function parseScriptTag(str) {
    var cdata = getParam(str, null, null, /^\s*<!\[CDATA\[([\s\S]*)?\]\]>\s*$/i);
    if (cdata)
        return cdata;
    return html_entity_decode(str);
}

function getNextPage(html, event, extra_params, options) {
    var form = getParam(html, null, null, /<form[^>]*name="f1"[^>]*>([\s\S]*?)<\/form>/i);
    var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="(\/ALFAIBSR[^"]*)/i, null, html_entity_decode);
    if (!action)
        throw new AnyBalance.Error('Не удаётся найти форму ввода команды. Сайт изменен?');

    if (!options)
        options = {};

    var params = createFormParams(form, function (params, str, name, value) {
        if (/::input$/.test(name))
            return; //Ненужные поля
        if (options.paramsFunc)
            value = (options.paramsFunc)(params, str, name, value);
        return value;
    }, true);
    var paramsModule = createParams(joinArrays(params, extra_params), event);
    var newhtml = AnyBalance.requestPost(g_baseurl + action, paramsModule, addHeaders(options.headers || {
            "Adf-Ads-Page-Id": g_pageID,
            "Adf-Rich-Message": "true",
            "Csrf-Token": g_csrfToken
        }), {options: options.requestOptions});
    if (!/<\?Adf-Rich-Response-Type\s*\?>/i.test(newhtml))
        return newhtml; //Не рич ответ, возвращаем, как есть

    var scripts;
    if (options.withScripts) {
        var join_n = create_aggregate_join('\n');
        scripts = sumParam(newhtml, null, null, /<script>([\s\S]*?)<\/script>/ig, null, parseScriptTag, join_n); //Получаем скрипты
    }

    var fragments = sumParam(newhtml, null, null, /<fragment>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/fragment>/ig); //Получаем фрагменты

    for (var i = 0; i < fragments.length; i++) {
        var fragment = fragments[i];
        var id = getParam(fragment, null, null, /^\s*<[^>]+[\s"]id="([^"]*)/i, null, html_entity_decode);
        if (id == 'afr::DocWrapper') {
            html = fragment;
            break; //У нас полная замена страницы
        }
        var elemToReplace = getElement(html, new RegExp('<\\w+[^>]*[\\s"]id="' + id + '"[^>]*>', 'i'));
        html = html.replace(elemToReplace, fragment);
    }

    if(/<div[^>]+id="pt1:menu:ATP2_r1"[^>]*>/i.test(html)) //Есть главное меню
        g_mainHtml = html;

    var pageId = getParam(newhtml, null, null, /AdfPage.PAGE._setPageId\('([^']*)/i, replaceSlashes);
    if(isset(pageId))
        g_pageID = pageId;

    return options.withScripts ? {html: html, scripts: scripts} : html;
}

function processCredits2(html, result) {
    if (!AnyBalance.isAvailable('credits'))
        return;

    AnyBalance.trace('Получаем информацию о кредитах');

    html = getMainPageOrModule2(html, 'crd');

    var creditTitles = getElements(html, /<a[^>]+id="[^"]*::disAcr"[^>]*>/ig);
    if (!creditTitles) {
        AnyBalance.trace('Не удаётся найти ни одного кредита!');
        return;
    }

    AnyBalance.trace('Кредитов в системе: ' + creditTitles.length);
    result.credits = [];

    for (var j = 0; j < creditTitles.length; ++j) {
        var crdhtml = html;
        if (j > 0) {
            AnyBalance.trace('Запрос кредита №' + (j + 1));
            var event = getParam(creditTitles[j], null, null, /<a[^>]+id="([^"]*)::disAcr"/i, null, html_entity_decode);
            crdhtml = getNextPage(html, event, [
                ['event', '%EVENT%'],
                ['event.%EVENT%', '<m xmlns="http://oracle.com/richClient/comm"><k v="expand"><b>1</b></k><k v="type"><s>disclosure</s></k></m>'],
                ['oracle.adf.view.rich.PROCESS', 'pt1:r12:0:pt2']
            ]);
        }

        //Подробная информация
        event = getParam(crdhtml, null, null, /<a[^>]+id="([^"]*)"[^>]*>&#1055;&#1086;&#1076;&#1088;&#1086;&#1073;&#1085;&#1072;&#1103; &#1080;&#1085;&#1092;&#1086;&#1088;&#1084;&#1072;&#1094;&#1080;&#1103;/i);
        if (!event) {
            AnyBalance.trace(crdhtml);
            throw new AnyBalance.Error('Не удаётся найти ссылку на подробную информацию о кредите!', {investigate: true});
        }

        AnyBalance.trace('Запрос данных по кредиту №' + (j + 1));
        crdhtml = getNextPage(crdhtml, event, [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ]);

        var id = getParam(crdhtml, null, null, /\d{20}/i);
        var name = getParam(creditTitles[j], null, null, null, replaceTagsAndSpaces, html_entity_decode);
        var crd = {
            __id: id,
            __name: name
        };

        if (__shouldProcess('credits', crd)) {
            processCredit2(crdhtml, crd);
        }

        result.credits.push(crd);
    }
}

//получаем ближайшую дату платежа из 10-е число.
function parseNDay(str){
	var d = getParam(str, null, null, /(\d+)[^<]*число/i, null, parseBalance);
 	if(!isset(d))
 		return;
    
     var dt = new Date();
     var dtNew = new Date(dt.getFullYear(), dt.getMonth() + (dt.getDate() > d ? 1 : 0), d);
     AnyBalance.trace('Parsed date ' + dtNew + ' from ' + str);
     return dtNew.getTime();
}

function processCredit2(html, result) {
    var params = getElements(html, /<table[^>]+pglCreditDetails(?:Label)?List[^>]*/ig);
    var wasMinpay = false;
    for (var i = 0; i < params.length; i++) {
        var param = params[i];
        var tds = getElements(param, /<td[^>]*>/ig);
        if (tds.length < 2)
            continue; //Неправильная опция
        var name = getParam(tds[tds.length - 2], null, null, null, replaceTagsAndSpaces, html_entity_decode);
        var value = getParam(tds[tds.length - 1], null, null, null, replaceTagsAndSpaces, html_entity_decode);

        if (/Для полного погашения|Доступно для трат/i.test(name)) {
            getParam(value, result, 'credits.balance', null, null, parseBalance);
            getParam(value, result, ['credits.currency', 'credits.balance'], null, null, parseCurrency);
        } else if (/Собственных средств/i.test(name)) {
            getParam(value, result, 'credits.own', null, null, parseBalance);
        } else if (/Задолженность|Остаток задолженности|Для полного погашения/i.test(name)) {
            getParam(value, result, 'credits.debt', null, null, parseBalance);
        } else if (/сумма основного долга/i.test(name) && !wasMinpay) {
            getParam(value, result, 'credits.debt_main', null, null, parseBalance);
        } else if (/сумма начисленных процентов/i.test(name) && !wasMinpay) {
            getParam(value, result, 'credits.debt_pct', null, null, parseBalance);
        } else if (/Процентная ставка/i.test(name)) {
            getParam(value, result, 'credits.pct', null, null, parseBalance);
        } else if (/Установленный лимит|Начальная сумма кредита/i.test(name)) {
            getParam(value, result, 'credits.limit', null, null, parseBalance);
        } else if (/Неподтверждённые операции/i.test(name)) {
            getParam(value, result, 'credits.blocked', null, null, parseBalance);
        } else if (/Льготный период/i.test(name)) {
            getParam(value, result, 'credits.grace', null, null, parseBalance);
        } else if (/Дата начала льготного периода/i.test(name)) {
            getParam(value, result, 'credits.grace_start', null, null, parseDateWord);
        } else if (/Дата окончания льготного периода/i.test(name)) {
            getParam(value, result, 'credits.grace_till', null, null, parseDateWord);
        } else if (/дата платежа|Оплатить до/i.test(name)) {
            getParam(value, result, 'credits.pay_till', null, null, parseDateWord);
        } else if (/Ближайший плат[её]ж|Минимальный плат[её]ж|Ежемесячный плат[её]ж/i.test(name)) {
        	wasMinpay = true;
            getParam(value, result, ['credits.minpay', 'credits.minpay_left'], null, null, parseBalance);
        } else if ('основной долг' == name && wasMinpay) {
            getParam(value, result, 'credits.minpay_main', null, null, parseBalance);
        } else if ('проценты' == name && wasMinpay) {
            getParam(value, result, 'credits.minpay_pct', null, null, parseBalance);
        } else if (/Дата выдачи/i.test(name)) {
            getParam(value, result, 'credits.date_start', null, null, parseDateWord);
        } else if (/Срок кредита/i.test(name)) {
            getParam(value, result, 'credits.period');
        } else if (/День платежа/i.test(name)) {
            getParam(value, result, 'credits.payment_day');
            getParam(value, result, 'credits.pay_till', null, null, parseNDay);
        } else if (/Уже внесено/i.test(name)) {
            getParam(value, result, ['credits.minpay_paid', 'credits.minpay_left'], null, null, parseBalance);
        } else {
            AnyBalance.trace('Неизвестный параметр: ' + name + ': ' + value + '\n' + param);
        }
    }

    getParam(html, result, 'credits.minpay_left', /<span[^>]+ACCreditsLargeHeaderFont[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    if (AnyBalance.isAvailable('credits.transactions')) {
        processCreditTransactions(html, result);
    }
}

function processCreditTransactions(html, result) {
    AnyBalance.trace('Получаем транзакции для счета ' + result.__name);

    function setSwitchTo3(params, str, name, value) {
        if (name == 'pt2:periodSwitch')
            return "3"; //Квартал
        /*if(name == 'pt1:id1') { // Из формы будем получать
         var dt = new Date(), dtFrom = new Date(dt.getFullYear()-2, dt.getMonth(), dt.getDate());
         return n2(dtFrom.getDate()) + '.' + n2(dtFrom.getMonth() + 1) + '.' + dtFrom.getFullYear();
         }*/
        return value;
    }

    //Показать подробную выписку
    var event = getParam(html, null, null, /<a[^>]+id="([^"]*)[^>]*>\s*&#1055;&#1086;&#1082;&#1072;&#1079;&#1072;&#1090;&#1100; &#1087;&#1086;&#1076;&#1088;&#1086;&#1073;&#1085;&#1091;&#1102; &#1074;&#1099;&#1087;&#1080;&#1089;&#1082;&#1091;/i);
    html = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PPR_FORCED', 'true']
    ]);

    html = getNextPage(html, 'pt2:periodSwitch', [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action]
    ], {paramsFunc: setSwitchTo3});
    /*
     html = getNextPage(html, 'pt1:showButton', [
     ['event', '%EVENT%'],
     ['event.%EVENT%', g_some_action]
     ], {paramsFunc: setSwitchTo5});

     html = getNextPage(html, 'pt1:downloadCSVLinkBottom', [
     ['event', '%EVENT%'],
     ['event.%EVENT%', g_some_action]
     ], {paramsFunc: setSwitchTo5});
     */
    html = getNextPage(html, 'pt2:downloadCSVLink', [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PROCESS', '%EVENT%']
    ], {paramsFunc: setSwitchTo3, headers: {}, requestOptions: {FORCE_CHARSET: 'windows-1251'}});

    var data = Papa.parse(html);
    AnyBalance.trace('Для счета ' + result.__name + ' получено ' + data.data.length + ' транзакций: ' + data.data[0].join(';'));

    var cols = {};
    for (var j = 0; j < data.data[0].length; ++j) {
        var col = data.data[0][j];
        if (col == 'Валюта')
            cols.currency = j;
        else if (col == 'Дата операции')
            cols.date = j;
        else if (col == 'Референс проводки')
            cols.id = j;
        else if (col == 'Описание операции')
            cols.descr = j;
        else if (col == 'Приход')
            cols.debit = j;
        else if (col == 'Расход')
            cols.credit = j;
    }

    result.transactions = [];

    var transhes = 0;

    for (j = 1; j < data.data.length; ++j) {
        var d = data.data[j], t = {};
        if (d.length >= 6) {
            if (isset(cols.descr) && /Предоставление транша\s+Дог/i.test(d[cols.descr])) {
                ++transhes;
                continue; //Предоставление транша неинтересно
            }
            if (isset(cols.date))
                getParam(d[cols.date], t, 'credits.transactions.date', null, null, parseDate);
            if (isset(cols.currency))
                getParam(d[cols.currency], t, 'credits.transactions.currency');
            if (isset(cols.descr))
                getParam(d[cols.descr], t, 'credits.transactions.descr');
            if (isset(cols.debit))
                sumParam(d[cols.debit], t, 'credits.transactions.sum', null, null, parseBalance, aggregate_sum);
            if (isset(cols.credit))
                sumParam(d[cols.credit], t, 'credits.transactions.sum', null, null, function (str) {
                    var val = parseBalance(str);
                    return val && -val
                }, aggregate_sum);
            if (isset(cols.ref))
                sumParam(d[cols.ref], t, 'credits.transactions.ref');

            result.transactions.push(t);
        }
    }

    if (transhes)
        AnyBalance.trace('Вырезано ' + transhes + ' тразакций "Предоставление транша"');
}

function processInfo2(html, result) {
    if (AnyBalance.isAvailable('info')) {
        AnyBalance.trace('Получаем информацию о пользователе');

        result = result.info = {};
        getParam(html, result, 'info.mphone', /<div[^>]*>([^<]*)<div[^>]+id="[^"]*mymobilePopup/i, replaceTagsAndSpaces, html_entity_decode);

        //настройки
        var event = getParam(html, null, null, /<a[^>]+id="([^"]*)[^>]*>\s*&#1085;&#1072;&#1089;&#1090;&#1088;&#1086;&#1081;&#1082;&#1080;\s*<\/a>/i, null, null, html_entity_decode);
        html = getNextPage(html, event, [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ]);

        var join_space = create_aggregate_join(' '), replaceValue = [/<input[^>]+value="([^"]*)".*/i, '$1', /<input.*/i, ''];

        //Логин
        getParam(html, result, 'info.login', /<label[^>]*>\s*&#1051;&#1086;&#1075;&#1080;&#1085;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        //Клиент
        getParam(html, result, 'info.fio', /<label[^>]*>\s*&#1050;&#1083;&#1080;&#1077;&#1085;&#1090;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        //Дополнительный логин
        getParam(html, result, 'info.login2', /<label[^>]*>\s*&#1044;&#1086;&#1087;&#1086;&#1083;&#1085;&#1080;&#1090;&#1077;&#1083;&#1100;&#1085;&#1099;&#1081; &#1083;&#1086;&#1075;&#1080;&#1085;[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode);
        //Е-mail
        getParam(html, result, 'info.email', /<label[^>]*>\s*(?:&#1045;|E)-mail[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode);
        //Рабочий телефон
        sumParam(html, result, 'info.wphone', /<label[^>]*>\s*&#1056;&#1072;&#1073;&#1086;&#1095;&#1080;&#1081; &#1090;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085;[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode, join_space);
        sumParam(html, result, 'info.wphone', /<label[^>]*>\s*&#1056;&#1072;&#1073;&#1086;&#1095;&#1080;&#1081; &#1090;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085;[\s\S]*?<input[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode, join_space);
        //Телефон по месту жительства
        sumParam(html, result, 'info.hphone', /<label[^>]*>\s*&#1058;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085; &#1087;&#1086; &#1084;&#1077;&#1089;&#1090;&#1091; &#1078;&#1080;&#1090;&#1077;&#1083;&#1100;&#1089;&#1090;&#1074;&#1072;[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode, join_space);
        sumParam(html, result, 'info.hphone', /<label[^>]*>\s*&#1058;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085; &#1087;&#1086; &#1084;&#1077;&#1089;&#1090;&#1091; &#1078;&#1080;&#1090;&#1077;&#1083;&#1100;&#1089;&#1090;&#1074;&#1072;[\s\S]*?<input[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode, join_space);
        //Телефон по месту регистрации
        sumParam(html, result, 'info.rphone', /<label[^>]*>\s*&#1058;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085; &#1087;&#1086; &#1084;&#1077;&#1089;&#1090;&#1091; &#1088;&#1077;&#1075;&#1080;&#1089;&#1090;&#1088;&#1072;&#1094;&#1080;&#1080;[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode, join_space);
        sumParam(html, result, 'info.rphone', /<label[^>]*>\s*&#1058;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085; &#1087;&#1086; &#1084;&#1077;&#1089;&#1090;&#1091; &#1088;&#1077;&#1075;&#1080;&#1089;&#1090;&#1088;&#1072;&#1094;&#1080;&#1080;[\s\S]*?<input[\s\S]*?(<input[^>]+)/i, replaceValue, html_entity_decode, join_space);
        //Услуга «Альфа-Чек» подключена к следующим картам:
        var check = getParam(html, null, null, /&#1059;&#1089;&#1083;&#1091;&#1075;&#1072; &laquo;&#1040;&#1083;&#1100;&#1092;&#1072;-&#1063;&#1077;&#1082;&raquo; &#1087;&#1086;&#1076;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1072; &#1082; &#1089;&#1083;&#1077;&#1076;&#1091;&#1102;&#1097;&#1080;&#1084; &#1082;&#1072;&#1088;&#1090;&#1072;&#1084;:[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
        if (check && AnyBalance.isAvailable('info.check')) {
            var cs = [];
            var rows = getElements(check, [/<tr[^>]*>/ig, /<span[^>]+class="mediumHeader"/i]);
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var c = {};
                getParam(row, c, 'info.check.card', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(row, c, 'info.check.phone', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                cs.push(c);
            }
            result.check = cs;
        }

        //Услуга «Альфа-Мобайл ... подключена
        getParam(html, result, 'info.mobile', /&#1059;&#1089;&#1083;&#1091;&#1075;&#1072; &laquo;&#1040;&#1083;&#1100;&#1092;&#1072;-&#1052;&#1086;&#1073;&#1072;&#1081;[^<]*&#8212; &#1087;&#1086;&#1076;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1072;/i, null, function (str) {
            return !!str
        });
    }
}


function processDeposits2(html, result) {
    if (!AnyBalance.isAvailable('deposits'))
        return;

    AnyBalance.trace('Получаем информацию о депозитах');

    html = getMainPageOrModule2(html, 'dep');

    var rows = sumParam(html, null, null, /<table[^>]+(?:[\s\S](?!<\/?table))*?>\d{20}<[\s\S]*?<\/table>/ig);
    if (!rows.length) {
        if (/Депозиты в банке, как и накопительные/i.test(html))
            AnyBalance.trace('Нет ни одного депозита');
        else {
            AnyBalance.trace('Не удалось найти депозиты: ' + html);
            return;
        }
    }

    AnyBalance.trace('Найдено депозитов: ' + rows.length);

    result.deposits = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var name = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        var id = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        var currency = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

        var d = {
            __id: id,
            __name: name + ' ' + currency + ' (' + id.substr(-4) + ')'
        };

        if (__shouldProcess('deposits', d)) {
            processDeposit2(html, row, d);
        }

        result.deposits.push(d);
    }
}

function parseBool(str) {
    if (/Не предусмотрена/i.test(str))
        return false;
    return /Да/i.test(str);
}

function processDeposit2(html, row, result) {
    AnyBalance.trace('Получаем депозит ' + result.__name);

    getParam(row, result, 'deposits.acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(row, result, 'deposits.accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(row, result, 'deposits.balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(row, result, 'deposits.currency', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(row, result, 'deposits.till', />\s*&#1044;&#1086; (\d+[^>]*<)/i, replaceTagsAndSpaces, parseDateWord);

    if (AnyBalance.isAvailable('deposits.expressnum', 'deposits.balance_start', 'deposits.pct_sum', 'deposits.date_start',
            'deposits.period', 'deposits.pct', 'deposits.pct_cap', 'deposits.topup', 'deposits.topup_till', 'deposits.topup_min',
            'deposits.withdraw', 'deposits.balance_min', 'deposits.pct_conditions', 'deposits.prolongate')) {
        //Детали депозита
        var event = getParam(row, null, null, /<a[^>]+id="([^"]*)"[^>]*p_AFTextOnly/i, null, html_entity_decode);
        html = getNextPage(html, event, [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ]);

        var params = getElements(html, /<tr[^>]+id="pt\d+:plam\d+[^>]*>/ig);
        for (var i = 0; i < params.length; i++) {
            var param = params[i];
            var name = getParam(param, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            var value = getParam(param, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

            if (/Экспресс-счёт/i.test(name)) {
                getParam(value, result, 'deposits.expressnum');
            } else if (/Сумма на дату открытия/i.test(name)) {
                getParam(value, result, 'deposits.balance_start', null, null, parseBalance);
            } else if (/Сумма выплаченных процентов/i.test(name)) {
                getParam(value, result, 'deposits.pct_sum', null, null, parseBalance);
            } else if (/Дата открытия/i.test(name)) {
                getParam(value, result, 'deposits.date_start', null, null, parseDateWord);
            } else if (/Срок депозита/i.test(name)) {
                getParam(value, result, 'deposits.period', null, null, parseBalance);
            } else if (/Процентная ставка$/i.test(name)) {
                getParam(value, result, 'deposits.pct', null, null, parseBalance);
            } else if (/Процентная ставка с учетом капитализации/i.test(name)) {
                getParam(value, result, 'deposits.pct_cap', null, null, parseBalance);
            } else if (/Возможность пополнения/i.test(name)) {
                getParam(value, result, 'deposits.topup', null, null, parseBool);
            } else if (/Крайний срок пополнения/i.test(name)) {
                getParam(value, result, 'deposits.topup_till', null, null, parseDateWord);
            } else if (/Минимальная сумма пополнения/i.test(name)) {
                getParam(value, result, 'deposits.topup_min', null, null, parseBalance);
            } else if (/Возможность частичного снятия/i.test(name)) {
                getParam(value, result, 'deposits.withdraw', null, null, parseBool);
            } else if (/Сумма неснижаемого остатка/i.test(name)) {
                getParam(value, result, 'deposits.balance_min', null, null, parseBalance);
            } else if (/Условие начисления процентов/i.test(name)) {
                getParam(value, result, 'deposits.pct_conditions');
            } else if (/Автоматическая пролонгация/i.test(name)) {
                getParam(value, result, 'deposits.prolongate', null, null, parseBool);
            } else if (/Текущий баланс|Депозитный счёт|Дата окончания/i.test(name)) {
                //continue; //Уже обработано
            } else {
                AnyBalance.trace('Неизвестный параметр ' + name + ': ' + value + '\n' + param);
            }
        }
    }

    if (AnyBalance.isAvailable('deposits.transactions')) {
        processDepositTransactions(html, result);
    }
}

function processDepositTransactions(html, result) {
    AnyBalance.trace('Получаем транзакции для депозита ' + result.__name);

    //Распечатать
    var event = getParam(html, null, null, /<a[^>]+id="([^"]*)[^>]*>\s*&#1056;&#1072;&#1089;&#1087;&#1077;&#1095;&#1072;&#1090;&#1072;&#1090;&#1100;/i);
    var o = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PROCESS', '%EVENT%']
    ], {withScripts: true});

    html = o.html;

    var url = getParam(o.scripts, null, null, /launchWindow\("([^"]*)/, replaceSlashes) + '&_rtrnId=' + new Date().getTime();
    var windowId = getParam(o.scripts, null, null, /launchWindow\("[^"]*",\s*'([^']*)/, replaceSlashes);
    html = AnyBalance.requestGet(g_baseurl + url, g_headers);

    var afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
    if (!afr)
        throw new AnyBalance.Error('Не удаётся найти параметр для входа: _afrLoop. Сайт изменен?');

    html = AnyBalance.requestGet(g_baseurl + url + '&_afrLoop=' + afr + '&_afrWindowMode=1&_afrWindowId=' + windowId, addHeaders({Referer: g_baseurl + url}));
    url = getParam(html, null, null, /<frame[^>]+id="_adfvdlg"[^>]*src="([^"]*)/i, null, html_entity_decode);

    //Получаем собственно распечатку
    html = AnyBalance.requestGet(g_baseurl + url, g_headers);

    //Ищем ссылку на csv
    event = getParam(html, null, null, /<img[^>]+id="([^"]*)::icon"[^>]*src="[^"]*csv/i, null, html_entity_decode);

    html = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PROCESS', '%EVENT%']
    ], {headers: {}, requestOptions: {FORCE_CHARSET: 'windows-1251'}});

    var data = Papa.parse(html);
    AnyBalance.trace('Для депозита ' + result.__name + ' получено ' + data.data.length + ' транзакций: ' + data.data[0].join(';'));

    var cols = {};
    for (var j = 0; j < data.data[0].length; ++j) {
        var col = data.data[0][j];
        if (col == 'Дата')
            cols.date = j;
        else if (col == 'Примечание')
            cols.descr = j;
        else if (col == 'Сумма')
            cols.sum = j;
        else if (col == 'Остаток')
            cols.balance = j;
    }

    result.transactions = [];

    for (j = 1; j < data.data.length; ++j) {
        var d = data.data[j], t = {};
        if (d.length >= 4) {
            if (isset(cols.descr) && /Предоставление транша\s+Дог/i.test(d[cols.descr])) {
                ++transhes;
                continue; //Предоставление транша неинтересно
            }
            if (isset(cols.date))
                getParam(d[cols.date], t, 'deposits.transactions.date', null, null, parseDate);
            if (isset(cols.descr))
                getParam(d[cols.descr], t, 'credits.transactions.descr');
            if (isset(cols.sum)) {
                getParam(d[cols.sum], t, 'deposits.transactions.sum', null, null, parseBalance);
                getParam(d[cols.sum], t, ['deposits.transactions.currency', 'deposits.transactions.sum', 'deposits.transactions.balance'], null, null, parseCurrency);
            }
            if (isset(cols.balance) && d[cols.balance])
                getParam(d[cols.balance], t, 'credits.transactions.balance', null, null, parseBalance);

            result.transactions.push(t);
        }
    }
}
