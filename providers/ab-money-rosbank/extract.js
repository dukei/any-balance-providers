/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о карте, кредите, депозите в банке "ХоумКредит".

Сайт: http://www.homecredit.ru
ЛК: https://ib.homecredit.ru
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    Origin:'https://ibank.rosbank.ru',
    Referer: 'https://ibank.rosbank.ru/',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36',
};

var g_baseurl = 'https://ibank.rosbank.ru/';

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
};

function getEventValidation(html) {
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/) || getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
};

function login() {
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestGet(g_baseurl, g_headers);
    if(!/Logout.aspx/i.test(html)) {
        html = AnyBalance.requestPost(g_baseurl + 'Login.aspx', {
            'ctl00$MainScriptManager':'ctl00$MainContentPlaceHolder$TabsUpdatePanel|ctl00$MainContentPlaceHolder$CardButton',
            __LASTFOCUS:'',
            __EVENTTARGET:'',
            __EVENTARGUMENT:'',
            __VIEWSTATE:getViewState(html),
            __EVENTVALIDATION:getEventValidation(html),
            'ctl00$MainContentPlaceHolder$pin1':'',
            'ctl00$MainContentPlaceHolder$TransCod':'',
            'ctl00$MainContentPlaceHolder$pin2enc':'',
            'ctl00$MainContentPlaceHolder$Signature':'',
            'ctl00$MainContentPlaceHolder$CardNumTextBox':prefs.login,
            __ASYNCPOST:'true',
            'ctl00$MainContentPlaceHolder$CardButton':'%D0%9F%D1%80%D0%BE%D0%B4%D0%BE%D0%BB%D0%B6%D0%B8%D1%82%D1%8C'
        }, addHeaders({'X-MicrosoftAjax':'Delta=true'}));

        var pin2enc = getParam(html,null,null,/class="pin2enc" value="(.*)"/);
        var TransCod = getParam(html,null,null,/class="TransCod" value="(.*)"/);
        var pin3 = prefs.password;
        var Signature = '';

        //Этот код расчета Signature выдран из main.js сайта (использует cryptojs.js и crb.js, которые приходят в ответе на аякс запрос предыдущий)
        var v = CRB.decryptPin2(pin2enc,pin3);
        if (v.result) {
            var sign = CRB.encryptBlock(v.result, TransCod);
            if (sign.result) {
                Signature = sign.result;
            }
            else {
                pin3 = '';
                throw new AnyBalance.Error(sign.error);
            }
        }
        else {
            pin3 = '';
            throw new AnyBalance.Error(v.error);
        }
        //Расчитали Signature

        html = AnyBalance.requestPost(g_baseurl + 'Login.aspx', {
            'ctl00$MainScriptManager':'ctl00$MainContentPlaceHolder$TabsUpdatePanel|ctl00$MainContentPlaceHolder$Pwd1Button',
            'ctl00$MainContentPlaceHolder$pin1':'50845000'+prefs.login.replace(' ',''),
            'ctl00$MainContentPlaceHolder$TransCod':TransCod,
            'ctl00$MainContentPlaceHolder$pin2enc':pin2enc,
            'ctl00$MainContentPlaceHolder$Signature':Signature,
            'ctl00$MainContentPlaceHolder$pin3':pin3,
            __LASTFOCUS:'',
            __EVENTTARGET:'',
            __EVENTARGUMENT:'',
            __VIEWSTATE:getViewState(html),
            __EVENTVALIDATION:getEventValidation(html),
            __ASYNCPOST:'true',
            'ctl00$MainContentPlaceHolder$Pwd1Button':'%D0%9F%D1%80%D0%BE%D0%B4%D0%BE%D0%BB%D0%B6%D0%B8%D1%82%D1%8C'
        }, addHeaders({'X-MicrosoftAjax':'Delta=true'}));

        if(!/Logout.aspx/i.test(html) && !/pageRedirect/i.test(html)){
            var error = getParam(html, null, null, /<div[^>]+class="loginError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error, null, /не найден/i.test(error));
            throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
        }
        
        __setLoginSuccessful()
    }else{
        AnyBalance.trace('Найдена активная сессия. Используем её.');
    }

    return html;
}

function processAccounts(result){
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var html = AnyBalance.requestGet(g_baseurl + 'Accounts.aspx', g_headers);

    var tbl = getElement(html, /<table[^>]+id="[^"]*_AccTable"[^>]*>/i);
    if(!tbl){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось получить таблицу счетов');
        return;
    }

    result.accounts = [];

    var trs = getElements(tbl, [/<tr[^>]*>/ig, /<td/i]);
    AnyBalance.trace('Нашли ' + trs.length + ' счетов');

    for(var i=0; i<trs.length; ++i){
        var tr = trs[i];
        var id = getParam(tr, null, null, /([\s\S]*?<\/td>){2}/i, replaceTagsAndSpaces, html_entity_decode);
        var name = getParam(tr, null, null, /([\s\S]*?<\/td>){1}/i, replaceTagsAndSpaces, html_entity_decode);

        var o = {
            __id: id,
            __name: name + ' ' + id.substr(-4),
            num: id
        };

        if(__shouldProcess('accounts', o)){
            processAccount(tr, o);
        }

        result.accounts.push(o);
    }
}

function processAccount(tr, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(tr, result, 'accounts.balance', /([\s\S]*?<\/td>){3}/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accounts.currency', /([\s\S]*?<\/td>){3}/i, replaceTagsAndSpaces, parseCurrency);

    if(AnyBalance.isAvailable('accounts.num', 'accounts.type', 'accounts.owner')) {
        var infourl = getParam(tr, null, null, /"(AccountInfo.aspx\?id=[^"]*)/i, null, html_entity_decode);
        var html = AnyBalance.requestGet(g_baseurl + infourl, g_headers);

        getParam(html, result, 'accounts.num', /Номер счёта:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'accounts.type', /Тип счёта:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'accounts.owner', /Наименование счёта:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('accounts.transactions')){
        processTransactions(tr, result);
    }

}

function processTransactions(tr, result){
    AnyBalance.trace('Получаем транзакции для ' + result.__name);

    var infourl = getParam(tr, null, null, /"(StatementsAuto.aspx\?id=[^"]*)/i, null, html_entity_decode);
    var html = AnyBalance.requestGet(g_baseurl + infourl, g_headers);

    //Одноколоночный заголовок убираем.
    var table = getElement(html, /<div[^>]+entryCont[^>]*>/i, [/<tr[^>]*>\s*<th[^>]*>[^<]*<\/th>\s*<\/tr>/i, '']);

    if(!table){
        var error = getElement(html, /<div[^>]+errorBlock[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            AnyBalance.trace(error);
        }else{
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу транзакций');
        }
        return;
    }

    var colsInfo = {
        date: {
            re: /Дата/i,
            result_func: parseDate
        },
        descr: {
            re: /Содержание/i,
            result_func: html_entity_decode
        },
        sum: {
            re: /Сумма/i
        }
    };

    result.transactions = [];
    processTable(table, result.transactions, 'accounts.transactions.', colsInfo);
}

function processCards(result){
    if(!AnyBalance.isAvailable('cards'))
        return;

    var html = AnyBalance.requestGet(g_baseurl + 'Accounts.aspx', g_headers);

    var tbl = getElement(html, /<table[^>]+id="[^"]*_CardsTable"[^>]*>/i);
    if(!tbl){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось получить таблицу карт');
        return;
    }

    result.cards = [];

    var trs = getElements(tbl, [/<tr[^>]*>/ig, /<td/i]);
    AnyBalance.trace('Нашли ' + trs.length + ' карт');

    for(var i=0; i<trs.length; ++i){
        var tr = trs[i];
        var id = getParam(tr, null, null, /([\s\S]*?<\/td>){2}/i, replaceTagsAndSpaces, html_entity_decode);
        var name = getParam(tr, null, null, /([\s\S]*?<\/td>){1}/i, replaceTagsAndSpaces, html_entity_decode);

        var o = {
            __id: id,
            __name: name + ' ' + id.substr(-4),
            num: id
        };

        if(__shouldProcess('cards', o)){
            processCard(tr, o);
        }

        result.cards.push(o);
    }
}

function processCard(tr, result){
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(tr, result, 'cards.till', /([\s\S]*?<\/td>){4}/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'cards.status', /([\s\S]*?<\/td>){3}/i, replaceTagsAndSpaces, html_entity_decode); //Карта активна

    if(AnyBalance.isAvailable('cards.balance', 'cards.currency', 'cards.num', 'cards.accnum')) {
        var infourl = getParam(tr, null, null, /"(CardInfo.aspx\?id=[^"]*)/i, null, html_entity_decode);
        var html = AnyBalance.requestGet(g_baseurl + infourl, g_headers);

        getParam(html, result, 'cards.balance', /Текущий доступный остаток:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.currency', /Валюта счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

        if(AnyBalance.getPreferences().full_num) {
            //И эти люди работают в банке...
            getParam(html, result, 'cards.num', /Номер карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }

        getParam(html, result, 'cards.accnum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\(.*/i, ''], html_entity_decode);
    }

    if(AnyBalance.isAvailable('cards.transactions')){
        processTransactions(tr, result);
    }

}

function processInfo(result){
    if(!AnyBalance.isAvailable('info'))
        return;

    var info = result.info = {};

    var html = AnyBalance.requestGet(g_baseurl + 'Profile.aspx', g_headers);
    getParam(html, info, 'info.fio', /<h3\s+class="two-cols"\s*>\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, info, 'info.email', /<a[^>]+EmailHyperLink[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, info, 'info.notify', /Уведомления:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); //не получать уведомлений|Получать уведомления только об успешных операциях|Получать уведомления обо всех активных операциях

    if(AnyBalance.isAvailable('info.phone')) {
        html = AnyBalance.requestGet(g_baseurl + 'ProfileChangeParams.aspx', g_headers);

        getParam(html, info, 'info.phone', /<input[^>]+PhoneTextBox[^>]+value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    }
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(/<a[^>]+href="Loans.aspx"/.test(html))
        html = AnyBalance.requestGet(baseurl + 'Loans.aspx');

    var re = new RegExp('(<tr[^>]*id=["\']?par_(?:[\\s\\S](?!<tr))*' + (prefs.contract || 'td') + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит №' + prefs.contract : 'ни одного кредита'));

    var result = {success: true};
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payTill', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payNext', /(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<span[^>]+id="ctl00_FIOLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'Logout.aspx', g_headers2);
    AnyBalance.setResult(result);
    
}

function processDeposits(result){
    if(!AnyBalance.isAvailable('deposits'))
        return;

    var html = AnyBalance.requestGet(g_baseurl + 'Deposits.aspx', g_headers);
    html = html.replace(/<!--[\s\S]*?-->/g, ''); //Вырежем комментарии

    var divs = getElements(html, /<div[^>]+class="entryCont"[^>]*>/i);
    if(divs.length == 0){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось получить вклады');
        return;
    }

    result.deposits = [];

    AnyBalance.trace('Нашли ' + divs.length + ' вкладов');

    for(var i=0; i<divs.length; ++i){
        var div = divs[i];
        var id = getParam(div, null, null, /([\s\S]*?<\/td>){3}/i, replaceTagsAndSpaces, html_entity_decode);
        var name = getParam(div, null, null, /<td[^>]*>([\s\S]*?<\/td>){1}/i, replaceTagsAndSpaces, html_entity_decode);

        var o = {
            __id: id,
            __name: name + ' ' + id.substr(-4),
            num: id
        };

        if(__shouldProcess('deposits', o)){
            processDeposit(div, o);
        }

        result.deposits.push(o);
    }
}

function parseBool(str){
    return /Да/i.test(str);
}

function processDeposit(div, result){
    AnyBalance.trace('Обработка вклада ' + result.__name);

    getParam(div, result, 'deposits.balance', /([\s\S]*?<\/td>){4}/i, replaceTagsAndSpaces, parseBalance);
    getParam(div, result, 'deposits.currency', /([\s\S]*?<\/td>){4}/i, replaceTagsAndSpaces, parseCurrency);
    getParam(div, result, 'deposits.agreement', /([\s\S]*?<\/td>){2}/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('deposits.num', 'deposits.num1', 'deposits.num2', 'deposits.type',
            'deposits.period', 'deposits.owner', 'deposits.date_start', 'deposits.date_end', 'deposits.balance_start',
            'deposits.balance_min', 'deposits.min_topup', 'deposits.pct', 'deposits.pct_sum', 'deposits.pct_period',
            'deposits.pct_period2', 'deposits.pct_next_till', 'deposits.pct_next', 'deposits.topup')) {
        var infourl = getParam(div, null, null, /"(DepositInfo.aspx\?id=[^"]*)/i, null, html_entity_decode);
        var html = AnyBalance.requestGet(g_baseurl + infourl, g_headers);

        getParam(html, result, 'deposits.num', /Номер\s+счёта\s+вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'deposits.num1', /Номер\s+счёта-синонима:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'deposits.type', /Вид\s+вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'deposits.period', /Срок\s+вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); //3 мес. 0 дн.
        getParam(html, result, 'deposits.owner', /ФИО\s+клиента:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'deposits.num2', /Счёт\s+погашения\s+суммы\s+вклада\s+и\s+%:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'deposits.date_start', /Дата\s+открытия\s+вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'deposits.date_end', /Дата\s+окончания\s+срока\s+вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'deposits.balance_start', /Начальная\s+сумма\s+вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'deposits.balance_min', /Минимальная\s+сумма\s+вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'deposits.min_topup', /Минимальная\s+сумма\s+пополнения:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'deposits.pct', /Текущая\s+ставка\s+%:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'deposits.pct_sum', /Выплаченные\s+%:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'deposits.pct_period', /Частота\s+выплаты\s+процентов\s+на\s+счёт\s+по\s+вкладу:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); //Ежемесячно
        getParam(html, result, 'deposits.pct_period2', /Частота\s+перечисления\s+процентов\s+на\s+счёт\s+погашения:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); //Конец срока
        getParam(html, result, 'deposits.pct_next_till', /Дата\s+очередного\s+начисления\s+процентов:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'deposits.pct_next', /Сумма\s+процентов\s+к\s+очередной\s+выплате:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'deposits.topup', /Пополнение:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBool);
    }

    if(AnyBalance.isAvailable('deposits.transactions')){
        processTransactions(div, result);
    }

}

function processCredits(result){
    if(!AnyBalance.isAvailable('deposits'))
        return;

    var html = AnyBalance.requestGet(g_baseurl + 'Loans.aspx', g_headers);

    var error = getElement(html, /<div[^>]+id="[^"]*_ErrorPanel"/i, replaceTagsAndSpaces, html_entity_decode);
    if(error){
        AnyBalance.trace("У вас нет кредитов: " + error);
        return;
    }

}
