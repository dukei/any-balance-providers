/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': '*/*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
    'Accept-Language': 'ru,en;q=0.8',
    'Origin': 'https://online.skbbank.ru',
    'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
};

var baseurl = 'https://online.skbbank.ru/';

var errors = {
    BAD_CREDENTIALS: 'Неправльное имя пользователя или пароль'
}

function login() {
    function checkForLoginError(html) {
        if (!/OK/i.test(html)) {
            var error = errors[getParam(html, null, null, null, AB.replaceTagsAndSpaces)];
            if (error)
                throw new AnyBalance.Error(error, null, /Неправльное имя пользователя или пароль/i.test(error));

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
        }
    }

    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    prefs.login = prefs.login.toLowerCase();

    var html = AnyBalance.requestGet(baseurl + 'auto/html/index.html', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
    }

    if (!/Подождите, идет загрузка.../i.test(html)) {
        html = AnyBalance.requestPost(baseurl + 'service/prelogin', {
            userName: prefs.login
        }, addHeaders({Referer: baseurl + 'ru/html/login.html'}));

        AnyBalance.trace('BSS response: ' + html);

        var data = html.split(';');
        var userNamePass = data[2];
        var clientSalt = data[3];
        var preloginId = data[4];

        var srpClient = new SRPClientContext(data[0], data[1]);
        var passwordData = srpClient.makeAuthorizationData(userNamePass, prefs.password);
        var sha1Password = calcSHA1(prefs.password);
        var passwordDataSHA = srpClient.makeAuthorizationData(userNamePass, sha1Password);
        var passwordDataSHASalt = srpClient.makeAuthorizationData(userNamePass, calcSHA1(hexToBase64(sha1Password) + clientSalt))
        var extPasswordData = srpClient.getAbytes();

        html = AnyBalance.requestPost(baseurl + 'service/login', {
            userName: prefs.login,
            passwordData: passwordData,
            passwordDataSHA: passwordDataSHA,
            passwordDataSHASalt: passwordDataSHASalt,
            extPasswordData: extPasswordData,
            language: 'ru',
            preloginId: preloginId
        }, addHeaders({Referer: baseurl + 'ru/html/login.html'}));

        checkForLoginError(html);

        html = AnyBalance.requestPost(baseurl + 'ru/auth.rt', {
            userName: prefs.login,
            signId: '',
        }, addHeaders({
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': baseurl + 'ru/html/login.html',
            'X-Requested-With': 'XMLHttpRequest'
        }));

        checkForLoginError(html);

        html = AnyBalance.requestGet(baseurl + 'service/postLogin', AB.addHeaders({
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': baseurl + 'ru/html/login.html'
        }));

        checkForLoginError(html);

        html = AnyBalance.requestGet(baseurl + 'def/retail/login.rt', AB.addHeaders({
            'Referer': baseurl + 'ru/html/login.html'
        }));
    } else {
        AnyBalance.trace('Уже залогинены, используем существующую сессию');
    }

    if (!/BSSCore\.logout\(\)/i.test(html)) {
        var error = errors[getParam(html, null, null, null, replaceTagsAndSpaces)];
        if (error)
            throw new AnyBalance.Error(error, null, /Неправльное имя пользователя или пароль/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
    }

    __setLoginSuccessful();

    return html;
}

function getInfoJson(href, jsid) {
    var html = AnyBalance.requestPost(baseurl + href, {
        JSID: jsid,
    }, addHeaders({Referer: baseurl + 'auto/html/index.html', 'X-Requested-With': 'XMLHttpRequest'}));

    try {
        var userInfo = getJson(html);
    } catch (e) {
        var userInfo = {
            data: {}
        };
    }
    return userInfo;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if (!AnyBalance.isAvailable('accounts'))
        return;

    var JSID = getParam(html, null, null, /var\s+JSID\s*=\s*'([^']+)/i);
    if (!isset(JSID))
        return;

    var info = getInfoJson('ru/retail/accounts.rt', JSID);

    var accounts = info.data[0].accounts;

    AnyBalance.trace('Найдено счетов: ' + accounts.length);
    result.accounts = [];

    for (var i = 0; i < accounts.length; ++i) {
        var acc = accounts[i];
        var id = acc.benefacc;
        var num = acc.acc;
        var title = acc.acctype + ' ' + id + ' ' + acc.curr;

        var c = {__id: id, __name: title, num: num};

        if (__shouldProcess('accounts', c)) {
//            processAccount(acc, c);
        }

        result.accounts.push(c);
    }
}

function processAccount(account, result) {
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(account.acctype, result, 'accounts.type');
    getParam(account.balance, result, 'accounts.balance', null, null, parseBalanceSilent);
    getParam(account.currency, result, ['accounts.currency', 'accounts.balance'], null, null, parseCurrency);
    getParam(account.date, result, 'accounts.date_start', null, null, parseDateWord);

    if (AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(html, result);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
    if (!AnyBalance.isAvailable('cards'))
        return;

    var JSID = getParam(html, null, null, /var\s+JSID\s*=\s*'([^']+)/i);
    if (!isset(JSID))
        return;

    var info = getInfoJson('ru/retail/cards?r=version:%202.2.0.167.SKBrevision:%204697c8e2d4d862a3289a93bdb56d5741d290a3c5', JSID);

    var cardList = info.data[0].cardsList;
    if (!cardList) {
        if (/У вас нет карт/i.test(html)) {
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        } else {
            AnyBalance.trace(JSON.stringify(info));
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
        return;
    }

    var cards = info.data[0].cardsList;
    AnyBalance.trace('Найдено карт: ' + cards.length);
    result.cards = [];

    for (var i = 0; i < cards.length; ++i) {
        var card = cards[i];
        var id = card.id;
        var num = card.number;
        var title = num + ' ' + card.name;

        var c = {__id: id, __name: title, num: num};

        if (__shouldProcess('cards', c)) {
            processCard(card, c);
        }

        result.cards.push(c);
    }
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card.amount, result, 'cards.amount', null, replaceTagsAndSpaces, parseBalanceSilent);
    getParam(card.balance, result, 'cards.balance', null, replaceTagsAndSpaces, parseBalanceSilent);
    getParam(card.creditLimit, result, 'cards.limit', null, replaceTagsAndSpaces, parseBalanceSilent);
    getParam(card.currCode, result, ['cards.currency', 'cards.balance', 'cards.amount', 'cards.limit'], null, replaceTagsAndSpaces);

    getParam(card.validDate + '', result, 'cards.till', null, replaceTagsAndSpaces, parseDateWord);
    getParam(card.holderName, result, 'cards.holderName', null, replaceTagsAndSpaces);
    getParam(card.cardAccount, result, 'cards.acc_num');
    getParam(card.name, result, 'cards.name');
    getParam(card.cardSort, result, 'cards.type', null, replaceTagsAndSpaces);

    if (isAvailable('cards.transactions'))
        processCardTransactions(card, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
    if (!AnyBalance.isAvailable('deposits'))
        return;

    var JSID = getParam(html, null, null, /var\s+JSID\s*=\s*'([^']+)/i);
    if (!isset(JSID))
        return;

    var info = getInfoJson('ru/retail/deposits?r=version:%202.2.0.167.SKBrevision:%204697c8e2d4d862a3289a93bdb56d5741d290a3c5', JSID);

    var deposits = info.data[0].accounts;

    AnyBalance.trace('Найдено депозитов: ' + deposits.length);
    result.deposits = [];

    for (var i = 0; i < deposits.length; ++i) {
        var dep = deposits[i];
        var id = dep.id;
        var num = dep.account;
        var title = dep.name;

        var c = {__id: id, __name: title, num: num};

        if (__shouldProcess('deposits', c)) {
            processDeposit(dep, c);
        }

        result.deposits.push(c);
    }
}

function processDeposit(deposit, result) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    getParam(deposit.amount, result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalanceSilent);
    getParam(deposit.currIso, result, ['deposits.currency', 'deposits.balance']);
    getParam(deposit.dateClose, result, 'deposits.till', null, replaceTagsAndSpaces, parseDateSilent);
    getParam(deposit.interestRate, result, 'deposits.pct', null, replaceTagsAndSpaces, parseBalanceSilent);

    if (isAvailable('deposits.transactions'))
        processDepositTransactions(deposit, result);
}


function processInfo(html, result) {
    var JSID = getParam(html, null, null, /var\s+JSID\s*=\s*'([^']+)/i);
    if (!isset(JSID))
        return;

    var info = result.info = {};

    var userInfo = getBlockInfoJson('1');

    getParam(userInfo.data.nameFull, info, 'info.fio');

    userInfo = getBlockInfoJson('2');

    getParam(userInfo.data.birthDate, info, 'info.birthday', null, replaceTagsAndSpaces, parseDate);
    getParam(userInfo.data.birthPlace, info, 'info.birthPlace', null, replaceTagsAndSpaces);
    getParam(userInfo.data.citizenship, info, 'info.citizenship', null, replaceTagsAndSpaces);

    userInfo = getBlockInfoJson('3');

    getParam(userInfo.data.passportSeries, info, 'info.passportSeries', null, replaceTagsAndSpaces);
    getParam(userInfo.data.passportNumber, info, 'info.passport', null, replaceTagsAndSpaces);
    getParam(userInfo.data.passportDate, info, 'info.passportDate', null, replaceTagsAndSpaces, parseDate);
    getParam(userInfo.data.passportPlace, info, 'info.passportPlace', null, replaceTagsAndSpaces);

    userInfo = getBlockInfoJson('5');

    getParam(userInfo.data.mobilePhone, info, 'info.mphone', null, replaceTagsAndSpaces);
    getParam(userInfo.data.workPhone, info, 'info.wphone', null, replaceTagsAndSpaces);
    getParam(userInfo.data.email, info, 'info.email', null, replaceTagsAndSpaces);

    function getBlockInfoJson(blockIndex) {
        var html = AnyBalance.requestPost(baseurl + 'ru/retail/personalData/fillBlock.rt', {
            JSID: JSID,
            blockNumber: blockIndex
        }, addHeaders({Referer: baseurl + 'auto/html/index.html', 'X-Requested-With': 'XMLHttpRequest'}));

        try {
            var userInfo = getJson(html);
        } catch (e) {
            var userInfo = {
                data: {}
            };
        }
        return userInfo;
    }
}
