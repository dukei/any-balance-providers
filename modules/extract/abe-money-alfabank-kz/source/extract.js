/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/


var g_baseurl = 'https://click.alfabank.kz/';
var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};
var g_requestVerificationToken;

function login() {
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    prefs.login = getParam(prefs.login, null, null, /^\+7\d{10}$/i, [/\+7(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 ($1) $2-$3-$4']);
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(g_baseurl + '/entrance', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
    }

    g_requestVerificationToken = getParam(html, null, null, /<input[^>]+value\s*=\s*['"]?([^'">\s]*)[^>]*id="hiddenRequestVerificationToken"/i, replaceHtmlEntities);

    if (!/logout/i.test(html)) {
        html = AnyBalance.requestPost(g_baseurl + '/Authorize/Login', JSON.stringify({
            'captchaText': '',
            'login': prefs.login,
            'pass': prefs.password
        }), addHeaders({
            Referer: g_baseurl,
            REQUEST_VERIFICATION_TOKEN: g_requestVerificationToken,
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/json'
        }));

        var json = getJson(html);

        if (json.Code == '0') {
            // Всё нормально
            html = AnyBalance.requestGet(g_baseurl + '/main', g_headers);
        } else if (json.Code == '-10012') {
            // Нужно показывать капчу
            throw new AnyBalance.Error(json.CodeDescription);
        } else {
            if (json.CodeDescription != "" && json.CodeDescription != null) {
                throw new AnyBalance.Error(json.CodeDescription, null, json.CodeDescription.indexOf('Логин или пароль') != -1);
            }
        }
    } else {
        AnyBalance.trace('Уже залогинены, используем существующую сессию')
    }

    __setLoginSuccessful();

    return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
    if(!AnyBalance.isAvailable('cards'))
        return;

    html = AnyBalance.requestGet(g_baseurl + '/Home/AccountsList', addHeaders({
        REQUEST_VERIFICATION_TOKEN: g_requestVerificationToken,
    }));

    var cards = getElements(html, /<div[^>]+slidelist__item_cover-\d+[^>]*>/ig);
    if(!cards.length) {
        if(/У вас нет карт/i.test(html)) { // не протестировано
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
        return;
    }

    AnyBalance.trace('Найдено карт: ' + cards.length);
    result.cards = [];

    for(var i=0; i < cards.length; ++i){
        var card = cards[i];
        var _id = getParam(card, null, null, /<a[^>]+href="\/card\/(\d+)"/i, replaceTagsAndSpaces);
        var title = getParam(card, null, null, /<div[^>]+card__name_renameable[^>]+>(.+)<\/div/i, replaceTagsAndSpaces);
        var num = getParam(card, null, null, /cardnumber__hidden(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
        title = title  + ' *' + num.substr(-4);
        
        var c = {__id: _id, num: num, __name: title};

        if (__shouldProcess('cards', c)) {
            processCard(card, c);
        }

        result.cards.push(c);
    }
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    html = AnyBalance.requestGet(g_baseurl + '/card/'+result.__id, g_headers);

    getParam(html, result, 'cards.balance', /Доступный остаток(?:[^>]*>){4}(.+)<\/span/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['cards.currency', 'cards.balance'], /Доступный остаток(?:[^>]*>){2}[^>]+money_([a-z]+)[^>]+>/i, [AB.replaceTagsAndSpaces, /(.*?)/i, '0$1'], parseCurrency);
    getParam(html, result, 'cards.blocked', /Заблокировано(?:[^>]*>){4}(.+)<\/span/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cards.status', /Статус(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.cardnum', /Номер карты(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.till', /Действительна до(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'cards.acc_num', /Номер счета(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.type', /<a[^>]+backlink(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces);

    if(isAvailable('cards.transactions'))
        processCardTransactions(card, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(g_baseurl + '/Home/AccountsList', addHeaders({
        REQUEST_VERIFICATION_TOKEN: g_requestVerificationToken,
    }));

    var accounts = getElements(html, /<div[^>]+slidelist__item_cover-account-\d+[^>]*>/ig);
    if(!accounts.length) {
        if(/У вас нет счетов/i.test(html)) { // не протестировано
            AnyBalance.trace('У вас нет счетов');
            result.accounts = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу со счетами.');
        }
        return;
    }

    AnyBalance.trace('Найдено счетов: ' + accounts.length);
    result.accounts = [];

    for(var i=0; i < accounts.length; ++i){
        var account = accounts[i];
        var _id = getParam(account, null, null, /<a[^>]+href="\/account\/(\d+)"/i, replaceTagsAndSpaces);
        var name = getParam(account, null, null, /<div[^>]+card__name_renameable[^>]+>(.+)<\/div/i, replaceTagsAndSpaces);
        var num = getParam(account, null, null, /card__helper[^>]+>([^<]+)</i, replaceTagsAndSpaces);

        var a = {__id: _id, num: num, type: name, __name: name};

        if (__shouldProcess('accounts', a)) {
            processAccount(account, a);
        }

        result.accounts.push(a);
    }
}

function processAccount(acc, result) {
    AnyBalance.trace('Обработка счета ' + result.num);

    getParam(result.num, result, 'accounts.acc_num');
    getParam(acc, result, 'accounts.balance', /slidelist__helper(?:[^>]*>){3}(.+)<\/span/i, replaceTagsAndSpaces, parseBalance);
    getParam(acc, result, ['accounts.currency', 'accounts.balance'], /slidelist__helper(?:[^>]*>){1}[^>]+money_([a-z]+)[^>]+>/i, [AB.replaceTagsAndSpaces, /(.*?)/i, '0$1'], parseCurrency);
    getParam(acc, result, 'accounts.date_start', /Дата открытия(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseDate);
    getParam(acc, result, 'accounts.type', /<a[^>]+backlink(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces);

    if(typeof processAccountTransactions != 'undefined') {
      processAccountTransactions(acc, result);
    }
}


function processInfo(html, result){
    var info = result.info = {};

    getParam(html, info, 'info.fio', /<div[^>]+class="client"(?:[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces);
}