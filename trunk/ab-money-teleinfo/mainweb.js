/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    try {
        doOld(prefs);
    } catch (e) {
        AnyBalance.trace(e.message);
        AnyBalance.trace('Войти в старый кабинет не удалось, пробуем новый...');
        doNew(prefs);
    }
}

function doNew(prefs) {
    var baseurl = 'https://www.telebank.ru/';
    var html = AnyBalance.requestGet(baseurl + 'content/telebank-client/ru/login.html', g_headers);

    html = AnyBalance.requestPost(baseurl + 'services/signin', {
        login: prefs.login,
        password: prefs.password,
        '_charset_': 'utf-8',
        'dateTime': '18:10:20 4-6-2014'
    }, addHeaders({Referer: baseurl + 'content/telebank-client/ru/login.html', 'X-Requested-With': 'XMLHttpRequest'}));

    var json = getJson(html);

    if (!json.authorized) {
        // Проверим на otp
        if (json.authConfirmation)
            throw new AnyBalance.Error('Телеинфо требует ввести одноразовый смс-код. Для использования данного провайдера, проверку кода необходимо отключить.');

        if (json.accountLocked)
            throw new AnyBalance.Error('Ваш аккаунт заблокирован банком, свяжитесь со службой технической поддержки для разблокирования аккаунта.', null, true);

        var error = json.error.msg;
        if (error)
            throw new AnyBalance.Error(error, null, /Логин или пароль введены неверно/i.test(error));

        throw new AnyBalance.Error('Не удалось зайти в Телеинфо. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + (json.redirectTo || '').replace(/\/$/, ''), g_headers);

    /*if (prefs.type == 'abs') {
     fetchAccountABS(baseurl);
     } else */
    fetchCardNew(baseurl, html, json);
}

function doOld(prefs) {
    var baseurl = 'https://old.telebank.ru/WebNew/';
    var html = AnyBalance.requestGet(baseurl + 'Login.aspx');

    if (!prefs.debug) {
        html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
            __EVENTVALIDATION: getEventValidation(html),
            __VIEWSTATE: getViewState(html),
            js: 1,
            m: 1,
            __LASTFOCUS: '',
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            Action: '',
            ButtonLogin: '',
            TextBoxName: prefs.login,
            TextBoxPassword: prefs.password
        });
    }
    if (!/location.href\s*=\s*"[^"]*Accounts.aspx/i.test(html)) {
        if (/id="ItemNewPassword"/i.test(html))
            throw new AnyBalance.Error('Телеинфо требует поменять пароль. Пожалуйста, войдите в Телеинфо через браузер, поменяйте пароль, а затем введите новый пароль в настройки провайдера.');
        if (/Проверка переменного кода/i.test(html))
            throw new AnyBalance.Error('Телеинфо требует ввести переменный код. Для использования данного провайдера, проверку кода необходимо отключить.');
        if (/id="LabelError"/i.test(html))
            throw new AnyBalance.Error(getParam(html, null, null, /id="LabelMessage"(?:[^>]*>){3}([^<]*)/i));

        throw new AnyBalance.Error('Не удалось зайти в Телеинфо. Сайт изменен?');
    }
    if (prefs.type == 'abs') {
        fetchAccountABS(baseurl);
    } else { //card
        fetchCard(baseurl);
    }
}

function fetchCardNew(baseurl, html, json) {
    var prefs = AnyBalance.getPreferences();

    var result = {success: true};

    html = AnyBalance.requestPost(baseurl + 'processor/process/minerva/info', {
        'action': 'EXECUTE',
        'topics': '[{"id":"portfolios","params":[{"ignoreCache":true}]}]',
        'ignoreCache': 'true',
        'locale': 'ru',
        'pageToken': json.pageToken,
    }, addHeaders({Referer: baseurl + json.redirectTo, 'X-Requested-With': 'XMLHttpRequest'}));

    var response = getJson(html);

    if (!response.result)
        throw new AnyBalance.Error('Не удалось найти данные по картам и счетам. Сайт изменен?');

    var str = JSON.stringify(response.result);
    for (var t = 0; t < 10; t++) {
        html = AnyBalance.requestPost(baseurl + 'processor/process/minerva/info', {
            'action': 'GET_INCOME',
            'allNotificationsRequired': 'false',
            'ignoreCache': 'false',
            'locale': 'ru',
            'actionIDs': str,
            'getIncomeParams': '{}',
            'pageToken': response.pageToken,
        }, addHeaders({Referer: baseurl + json.redirectTo, 'X-Requested-With': 'XMLHttpRequest'}));

        response = getJson(html);

        if (/"id":"portfolios"/i.test(html))
            break;
    }

    var FoundProduct;
    for (var i = 0; i < response.topics.length; i++) {
        var curr = response.topics[i];
        // Интересуют только продукты банка
        if (/portfolios/i.test(curr.id)) {
            for (var z = 0; z < curr.items.length; z++) {
                var item = curr.items[z];
                // Вот, наконец-то нашли
                if (/Счета и карты|Вклады и сбережения/i.test(item.name)) {
                    // Ищем нужную
                    for (var r = 0; r < item.products.length; r++) {
                        var product = item.products[r];

                        for (var p = 0; p < product.groups.length; p++) {
                            var group = product.groups[p];

                            for (var e = 0; e < group.items.length; e++) {
                                var groupItem = group.items[e];

                                if (prefs.type == 'card' && !/Card/i.test(groupItem.classType)) {
                                    AnyBalance.trace('Продукт с номером ' + groupItem.number + ' не соответствует, т.к. не является картой...');
                                    continue;
                                }

                                if (!prefs.card || new RegExp(prefs.card + '$').test(groupItem.number)) {
                                    AnyBalance.trace('Продукт с номером ' + groupItem.number + ' соответствует, возьмем его...');
                                    FoundProduct = groupItem;
                                    break;
                                }
                            }
                            if (FoundProduct)
                                break;
                        }
                        if (FoundProduct)
                            break;
                    }
                    if (FoundProduct)
                        break;
                }
                if (FoundProduct)
                    break;
            }
        }
    }

    if (!FoundProduct) {
        throw new AnyBalance.Error(prefs.card ? 'Не найдена карта или счет с последними цифрами ' + prefs.card : 'Не найдено ни одной карты/счета!');
    }

    var result = {success: true};

    //getParam(html, result, 'fio', /<div[^>]+id="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(FoundProduct.number + '', result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(FoundProduct.name + '', result, 'cardname', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(FoundProduct.number + '', result, 'cardnum', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(FoundProduct.amount.sum + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(FoundProduct.amount.currency + '', result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'accbalance', 'own', 'blocked'], null, replaceTagsAndSpaces, html_entity_decode);

    if (isAvailable(['minpaytill', 'minpay', 'blocked', 'own', 'limit', 'credit_till', 'pct', 'gracepay', 'gracetill'])) {

        html = AnyBalance.requestPost(baseurl + 'processor/process/minerva/info', {
            'action': 'EXECUTE',
            'topics': JSON.stringify([{
                "id": "details",
                "params": [{"objects": [{"id": FoundProduct.id, "className": FoundProduct.classType}]}]
            }]),
            'ignoreCache': 'false',
            'locale': 'ru',
            'pageToken': response.pageToken,
        }, addHeaders({Referer: baseurl + json.redirectTo, 'X-Requested-With': 'XMLHttpRequest'}));

        response = getJson(html);
        /*	    //Неосвоенные счетчики
         <counter id="accbalance" name="Остаток на счете" units=" {@currency}"/>
         <counter id="own_free" name="Свободные собственные средства" units=" {@currency}"/>
         <counter id="accnum" name="Номер счета" type="text"/>
         */
        html = AnyBalance.requestPost(baseurl + 'processor/process/minerva/info', {
            'action': 'GET_INCOME',
            'allNotificationsRequired': 'false',
            'ignoreCache': 'false',
            'locale': 'ru',
            'actionIDs': JSON.stringify(response.result),
            'getIncomeParams': '{}',
            'pageToken': response.pageToken,
        }, addHeaders({Referer: baseurl + json.redirectTo, 'X-Requested-With': 'XMLHttpRequest'}));

        response = getJson(html);

        var details = null;
        for (var i = 0; i < response.topics.length; ++i) {
            if (response.topics[i].id == 'details') {
                details = response.topics[i];
                break;
            }
        }
        if (!details)
            throw new AnyBalance.Error('Не удаётся найти детальную информацию для продукта ' + FoundProduct.name);

        var prod = null;
        for (var i = 0; i < details.items.length; ++i) {
            if (details.items[i].id == FoundProduct.id) {
                prod = details.items[i];
                break;
            }
        }

        if (!prod)
            throw new AnyBalance.Error('Не удаётся найти детали для продукта ' + FoundProduct.name);

        if (prod.classType == 'CreditCard') {
            getParam('' + prod.properties['cards.details.credit.nextPayment'], result, 'minpaytill', null, null, parseDate);
            getParam('' + prod.properties['cards.details.credit.minAmountForRepayment'], result, 'minpay', null, null, parseBalance);
            getParam('' + prod.properties['cards.details.creditcard.allowed-sum-details']['cards.details.blocked'], result, 'blocked', null, null, parseBalance);
            getParam('' + prod.properties['cards.details.creditcard.allowed-sum-details']['cards.details.amountSum'], result, 'own', null, null, parseBalance);
            getParam('' + prod.properties['cards.details.creditcard.allowed-sum-details']['cards.details.credit.limit'], result, 'limit', null, null, parseBalance);
            getParam('' + prod.properties['cards.details.credit.limitEndDate'], result, 'credit_till', null, null, parseDate);
            getParam('' + prod.properties['cards.details.credit.interestRate'], result, 'pct', null, null, parseBalance);
            getParam('' + prod.properties['cards.details.credit.graceEndDate'], result, 'gracetill', null, null, parseDate);
            getParam('' + prod.properties['cards.details.credit.graceAmountForRepayment'], result, 'gracepay', null, null, parseBalance);
        } else {
            AnyBalance.trace('Не умеем получать детали для ' + prod.classType + ': ' + JSON.stringify(response));
        }

    }

    AnyBalance.setResult(result);
}

function fetchAccountABS(baseurl) {
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestGet(baseurl + 'Accounts/Accounts.aspx?_ra=4');
    if (prefs.card && !/^\d{4,20}$/.test(prefs.card))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    var table = getParam(html, null, null, /<table[^>]+class="[^"]*accounts[^>]*>([\s\S]*?)<\/table>/i);
    if (!table)
        throw new AnyBalance.Error('Не найдена таблица счетов. Сайт изменен?');
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.card || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;
    var result = {success: true};

    var re = new RegExp('(<tr[^>]*(?:[\\s\\S](?!</tr))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if (!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.card ? 'счет с ID ' + prefs.card : 'ни одного счета'));

    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<div[^>]+id="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function fetchCard(baseurl) {
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl + 'Accounts/Accounts.aspx');
    var result = {success: true};

    var accounts = getParam(html, null, null, /<table[^>]+class="accounts[\s\S]*?<\/table>/i);
    if (!accounts) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найдена таблица счетов и карт. Сайт изменен?');
    }

    // Сводка
    sumParam(accounts, result, 'all', /\d+(?:\s*[\dX]{4}){3}\s*<\/td>[\s\S]*?<\/tr>/ig, [/(\d+(?:\s*[\dX]{4}){3})\s*<\/td>([\s\S]*?)<\/tr>/i, '$1: $2', replaceTagsAndSpaces], html_entity_decode, function aggregate_join(values) {
        if (values.length == 0) return;
        var ret = values.join('\n');
        return ret.replace(/^(?:\s*,\s*)+|(?:\s*,\s*){2,}|(?:\s*,\s*)+$/g, '');
    });

    var card_tr = getParam(accounts, null, null, new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr))*?(?:XX\\s*){3}' + (prefs.card ? prefs.card : '\\d{4}') + '[\\s\\S]*?</tr>', 'i'));
    if (!card_tr)
        throw new AnyBalance.Error(prefs.card ? 'Не найдена карта с последними цифрами ' + prefs.card : 'Не найдено ни одной карты');

    getParam(html, result, 'fio', /<div[^>]+id="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card_tr, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'accbalance', 'own', 'blocked'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable('own_free', 'pct', 'accnum', 'limit', 'credit_till', 'minpaytill', 'minpay', 'gracetill', 'gracepay', 'accbalance', 'own', 'blocked')) {
        var accid = getParam(card_tr, null, null, /accountid=([\-0-9]+)/i);
        if (accid) {
            html = AnyBalance.requestGet(baseurl + 'Accounts/Account.aspx?accountid=' + accid + '&systemid=ssOpenway');
            getParam(html, result, 'accnum', /<span[^>]+id="[^"]*LabelCardAccountNumber"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'pct', /<span[^>]+id="[^"]*LabelCardRate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'limit', /<span[^>]+id="[^"]*LabelCardCreditLimit"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'credit_till', /<span[^>]+id="[^"]*LabelCardCreditLimitEndDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'minpaytill', /<span[^>]+id="[^"]*LabelCardMonthlyPaymentDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'gracetill', /<span[^>]+id="[^"]*LabelCardGracePeriodEndDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'minpay', /<span[^>]+id="[^"]*LabelCardMinimumPayment"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'gracepay', /<span[^>]+id="[^"]*LabelCardGracePeriodSum"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'accbalance', /<span[^>]+id="[^"]*LabelCardRest"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

            var own = getParam(html, null, null, /<span[^>]+id="[^"]*LabelCardOwnMoney"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            var blocked = getParam(html, null, null, /<span[^>]+id="[^"]*LabelCardBlocked"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

            getParam(own, result, 'own');
            getParam(blocked, result, 'blocked');

            if (isset(blocked) && isset(own)) {
                getParam(own - blocked, result, 'own_free');
            }
        } else {
            AnyBalance.trace('Не удалось найти идентификатор счета карты и получить по ней подробную информацию');
        }
    }
    AnyBalance.setResult(result);
}

function getViewState(html) {
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html) {
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}