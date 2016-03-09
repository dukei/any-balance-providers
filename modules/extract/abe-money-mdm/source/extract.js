/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

var g_baseurl = 'https://client.mdmbank.ru';

function login() {
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestGet(g_baseurl + '/index.asp', addHeaders({Referer: g_baseurl + '/index.asp'}));
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка интернет-банка. Попробуйте обновить данные позже.');
	}

    if(!/logout\.asp/i.test(html)) {
        html = AnyBalance.requestPost(g_baseurl + '/login.asp', {
            unc: prefs.login,
            pin: prefs.password
        }, addHeaders({Referer: g_baseurl + '/login.asp'}));
    }else{
        AnyBalance.trace('Уже залогинены, отлично.');
    }

    if(!/logout\.asp/i.test(html)) {
        var form = getElement(html, /<form[^>]+id="ib-loginotp-form"[^>]*>/i);
        if(form){
            AnyBalance.trace('Требуется SMS-подтверждение входа. Запрашиваем его.');
            var msg = getParam(form, null, null, /<label[^>]*for="password"[^>]*>([\s\S]*?)<\/label>/i, [replaceTagsAndSpaces, /и нажмите.*/i, '']);
            html = AnyBalance.requestPost(g_baseurl + '/ajax2.asp', {ajaxmode: 'otpget'}, addHeaders({Referer: g_baseurl + '/loginotp.asp', 'X-Requested-With': 'XMLHttpRequest'}));
            var json = getJson(html);
            if(json.result != '0') {
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Не удалось потребовать посылки SMS-подтверждения. Попробуйте ещё раз позже.');
            }

            var params = createFormParams(form, function(params, str, name, value) {
                if (name == 'password')
                    return AnyBalance.retrieveCode(msg || 'Пожалуйста, введите код из SMS для подтверждения входа в интернет-банк.\n\nВы можете отключить требование кода на вход в настройках своего интернет банка, чтобы не вводить его каждый раз. Это безопасно, совершение операций всё равно будет требовать ввода одноразового пароля.', null, {inputType: 'number', time: 180000});
                return value;
            }, true);

            html = AnyBalance.requestPost(g_baseurl + '/loginotp.asp', params, addHeaders({Referer: g_baseurl + '/loginotp.asp'}));
        }
    }

	if(!/logout\.asp/i.test(html)) {
        var error = getParam(html, null, null, /<div[^>]+class=['"]err['"][^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /\s*Вам выслан новый.*/i, '']);
        if (error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		error = getParam(html, null, null, /<label[^>]*>((?:[\s\S](?!<\/label>))*RetailWeb.Web.ClientLogin[\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

        error = getParam(html, null, null, /<div id="error-dialog"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
	}

    __setLoginSuccessful();

    return html;
}


/*

var result;
if (prefs.type == 'crd')
    result = fetchCredit(baseurl);
else if (prefs.type == 'acc')
    result = fetchAccount(baseurl);
else if (prefs.type == 'dep')
    result = fetchDeposit(baseurl);
else
    result = fetchCard(baseurl); //По умолчанию карта

if(isAvailable('bonus')){
    html =  AnyBalance.requestGet(baseurl + 'bonus.asp', addHeaders({ Referer: baseurl + 'bonus.asp' }));
    if(html && AnyBalance.getLastStatusCode() < 400){
        var bonusHref =  getParam(html, null, null, /bonus_frame[^>]+src="([^"]+)/i);
        AnyBalance.trace('Ссылка на бонусную программу: ' + bonusHref)
        if(bonusHref){
            html =  AnyBalance.requestGet(bonusHref, g_headers);
            getParam(html, result, 'bonus', /cartLink[^>]*>(\d+)/i, replaceTagsAndSpaces, parseBalance);
        }
    }
}

*/

function processCards(html, result){
    if(!AnyBalance.isAvailable('cards'))
        return;

    var html = AnyBalance.requestGet(g_baseurl + '/cards.asp', addHeaders({Referer: g_baseurl + '/index.asp'}));

    var table = getElement(html, /<table[^>]*card-table[^>]*>/i);
    if(!table){
        if(!/На данный момент у Вас нет[^<]*карт/i.test(html)) {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти карты! Сайт изменен?');
        }else {
            AnyBalance.trace('Нет ни одной карты');
        }
        return;
    }

    var rows = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
    AnyBalance.trace('Найдено ' + rows.length + ' карт');

    result.cards = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var id = getParam(row, null, null, /<a[^>]+href="[^"]*card-statement[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
        var currency = getParam(row, null, null, /<td[^>]+card-currency[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var name = id + ' ' + currency;

        var c = {
            __id: id,
            __name: name,
            num: id

        };

        if(__shouldProcess('cards', c)){
            processCard(row, c);
        }

        result.cards.push(c);
    }

}

function processCard(tr, result){
    AnyBalance.trace('Обрабатываем карту ' + result.__name);

    getParam(tr, result, ['cards.currency', 'cards.balance', 'cards.limit', 'cards.blocked',
        'cards.available', 'cards.debt_main', 'cards.debt_due', 'cards.debt_pct', 'cards.debt_peni', 'cards.debt_comission',
        'cards.minpay', 'cards.debt', 'cards.transactions.sum_account'], /<td[^>]+class="card-currency"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'cards.balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cards.blocked', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cards.limit', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cards.till', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    var href = getParam(tr, null, null, /<a[^>]+href="([^"]*card-statement[^"]*)"[^>]*>/i, replaceHtmlEntities);
   
    if(AnyBalance.isAvailable('cards.available', 'cards.debt_main', 'cards.debt_due', 'cards.debt_pct', 'cards.debt_peni', 'cards.debt_comission',
            'cards.minpay', 'cards.debt', 'cards.minpay_till', 'cards.transactions')){
        html = AnyBalance.requestGet(joinUrl(g_baseurl, href), addHeaders({Referer: g_baseurl + '/cards.asp'}));

        getParam(html, result, 'cards.available', /<td[^>]*>\s*Доступные средства[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.debt_main', /Сумма основной задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.debt_due', /Сумма просроченной задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.debt_pct', /Начисленные проценты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.debt_peni', /Просроченные проценты, штрафы, пени[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.debt_comission', /Комиссионная задолженность[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.minpay', /Минимальная сумма взноса[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.minpay_till', /Минимальная сумма взноса(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/tr>/, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'cards.debt', /Сумма полной задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);

        getParam(html, result, 'cards.overlimit', /Сумма использованных сверхлимитных средств[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.accnum', /Р\/с([^<]*)/i, replaceTagsAndSpaces);

        if(AnyBalance.isAvailable('cards.transactions')){
            processCardTransactions(html, result);
        }
    }

    return result;
}

var replaceSign = [/<td[^>]+red[^>]*>/i, '-', replaceTagsAndSpaces];

function processCardTransactions(html, result){
    var colsCardTransactions = {
        date: {
            re: /Дата проведения/i,
            result_func: parseDateSilent,
        },
        date_done: {
            re: /Дата отражения/i,
            result_func: parseDateSilent,
        },
        descr: {
            re: /Детали операции/i,
            result_func: null,
        },
        place: {
            re: /Город и страна/i,
            result_func: null,
        },
        sum: {
            re: /Сумма операции/i,
            result_func: parseBalanceSilent,
        },
        currency: {
            re: /Валюта операции/i,
            result_func: null,
            result_name: ['currency', 'sum'],
        },
        fee: {
            re: /Комиссия Банка/i,
            result_func: parseBalanceSilent,
        },
        sum_in: {
            re: /Сумма зачисления/i,
            result_name: 'sum_done',
            result_sum: true,
            result_replace: replaceSign,
            result_func: parseBalanceSilent,
        },
        sum_out: {
            re: /Сумма зачисления/i,
            result_name: 'sum_done',
            result_sum: true,
            result_replace: replaceSign,
            result_func: parseBalanceSilent,
        },
    };


    var dt = new Date();
    var dtFrom = new Date(dt.getFullYear() - 5, dt.getMonth(), 1);

    html = AnyBalance.requestPost(g_baseurl + '/card-statement.asp', {
        id: getParam(html, null, null, /<input[^>]+name="id"[^>]*value="([^"]*)/i, replaceHtmlEntities),
        fromdate: fmtDate(dtFrom),
        todate: fmtDate(dt)
    }, addHeaders({Referer: g_baseurl + '/card-statement.asp'}));

    var table = getElement(html, /<table[^>]+class="card-table"[^>]*>/i);
    if(!table){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти таблицу транзакций по карте!');
        return;
    }

    result.transactions = [];

    var activeCard;
    processTable(table, result.transactions, 'cards.transactions.', colsCardTransactions, function(tr){
        //Проверим, не маркер ли это новой карты
        var card = getParam(tr, null, null, /\d{4,6}x{6,8}\d{4}/i);
        if (card) {
            activeCard = card;
        }

    }, function (t, path){
        getParam(activeCard, t, path + 'card');
    });
}

function initCols(colsDef, ths){
    var cols = {};
    for (var i = 0; i < ths.length; i++) {
        var th = ths[i];
        for(var name in colsDef){
            if(colsDef[name].re.test(th))
                cols[name] = i;
        }
    }
    return cols;
}

function fillColsResult(colsDef, cols, tds, result, path){
    function getset(val, def){
        return isset(val) ? val : def;
    }
    path = path || '';

    var rts = replaceTagsAndSpaces,
        pb = parseBalance,
        as = aggregate_sum;

    for(var name in colsDef){
        var cd = colsDef[name];
        if(isset(cols[name])){
            var td = tds[cols[name]];
            var rn = getset(cd.result_name, name);
            if(isArray(rn)){
                var rn1 = [];
                for (var i = 0; i < rn.length; i++) {
                    rn1.push(path + rn[i]);
                }
                rn = rn1;
            }else{
                rn = path + rn;
            }

            if(cd.result_process) {
                cd.result_process(path, td, result);
            }else if(cd.result_sum){
                cd.result_re && (cd.result_re.lastIndex = 0);
                sumParam(td, result, rn, cd.result_re, getset(cd.result_replace, rts), getset(cd.result_func, pb), getset(cd.result_aggregate, as));
            }else {
                getParam(td, result, rn, cd.result_re, getset(cd.result_replace, rts), getset(cd.result_func, pb));
            }
        }
    }
}

function processCredits(html, result){
    if(!AnyBalance.isAvailable('credits'))
        return;

    html = AnyBalance.requestGet(g_baseurl + '/loans.asp', addHeaders({Referer: g_baseurl + '/index.asp'}));

    var table = getElement(html, /<table[^>]*card-table[^>]*>/i);
    if(!table){
        if(!/На данный момент у Вас нет[^<]*кредитов/i.test(html)) {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти кредиты! Сайт изменен?');
        }else {
            AnyBalance.trace('Нет ни одного кредита');
        }
        return;
    }

    var rows = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
    AnyBalance.trace('Найдено ' + rows.length + ' кредитов');

    result.credits = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var id = getParam(row, null, null, /<a[^>]+href=["'][^"']*loan-statement.asp\?id=([^'"&]*)/i, null, html_entity_decode);
        var name = getParam(row, null, null, /<a[^>]+href=["'][^"']*loan-statement.asp[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
        var num = getParam(row, null, null, /№\s*(\S+)/i);

        var c = {
            __id: id,
            __name: name,
            agreement: num

        };

        if(__shouldProcess('credits', c)){
            processCredit(row, c);
        }

        result.credits.push(c);
    }
}

function processCredit(tr, result){
    AnyBalance.trace('Обрабатываем кредит ' + result.__name);

    getParam(tr, result, ['credits.currency', 'credits.balance', 'credits.minpay', 'credits.balance_acc'], /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'credits.balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'credits.minpay', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'credits.minpay_till', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'credits.date_end', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'credits.date_start', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    //getParam(tr, result, 'credits.agreement', /№\s*([^<]*)/i, replaceTagsAndSpaces); //Уже получено

    var href = getParam(tr, null, null, /<a[^>]+href=["']([^"']*loan-statement[^'"]*)/i, replaceHtmlEntities);

    if(AnyBalance.isAvailable('credits.transactions', 'credits.accnum', 'credits.pct', 'credita.balance_acc', 'credits.schedule')){
        var html = AnyBalance.requestGet(joinUrl(g_baseurl, href), addHeaders({Referer: g_baseurl + '/credits.asp'}));

        getParam(html, result, 'credits.pct', /Процентная ставка[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credits.accnum', /Счет погашения[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/, replaceTagsAndSpaces);
        getParam(html, result, 'credita.balance_acc', /Остаток на счете погашения[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/, replaceTagsAndSpaces, parseBalance);

        if(AnyBalance.isAvailable('credits.schedule')){
            processCreditSchedule(html, result);
        }
        if(AnyBalance.isAvailable('credits.transactions')){
            processCreditTransactions(html, result);
        }
    }

    return result;
}

function processTable(table, result, path, colsDef, onWrongSize, onFilledResult){
    var trs = getElements(table, /<tr[^>]*>/ig);
    var cols, size;
    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var tds = getElements(tr, /<td[^>]*>/ig);
        if(tds.length == 0) {
            //Заголовок
            var ths = getElements(tr, /<th[^>]*>/ig);
            size = ths.length;
            cols = initCols(colsDef, ths);
        }else if(tds.length == size){
            var t = {};

            fillColsResult(colsDef, cols, tds, t, path);
            if(onFilledResult)
                onFilledResult(t, path);

            result.push(t);
        }else if(onWrongSize){
            onWrongSize(tr, tds);
        }
    }
}

function processCreditSchedule(html, result){
    var colsCreditSchedule = {
        date: {
            re: /Дата платежа/i,
            result_func: parseDateSilent
        },
        loan: {
            re: /Ссуда/i,
            result_process: function(path, td, result){
                var info = this; //Остальные параметры
                td = replaceAll(td, replaceTagsAndSpaces);
                getParam(td, result, path + 'debt_main', /([^\/]*)/i, null, parseBalanceSilent);
                getParam(td, result, path + 'debt_pct', /[^\/]*\/([^\/]*)/i, null, parseBalanceSilent);
                getParam(td, result, path + 'debt_fee', /(?:[^\/]*\/){2}([^\/]*)/i, null, parseBalanceSilent);
            }
        },
        sum: {
            re: /Сумма/i,
            result_func: parseBalanceSilent,
        },
        balance: {
            re: /Остаток/i,
            result_func: parseBalanceSilent,
        },
        status: {
            re: /Состояние/i,
            result_func: null
        }
    };

    var table = getParam(html, null, null, /График возврата кредита:[\s\S]*?<table[^>]*card-table[^>]*>([\s\S]*?)<\/table>/i);
    if(!table){
        AnyBalance.trace(html);
        AnyBalance.trace('Не найден график возврата кредита');
        return;
    }

    result.schedule = [];

    processTable(table, result.schedule, 'credits.schedule.', colsCreditSchedule);
}


function processCreditTransactions(html, result){
    var colsCreditTransactions = {
        date: {
            re: /Дата/i,
            result_func: parseDateSilent
        },
        descr: {
            re: /Операция/i,
            result_func: null
        },
        sum: {
            re: /Сумма/i,
            result_func: parseBalanceSilent,
        },
        currency: {
            re: /Валюта/i,
            result_func: null
        }
    };

    var table = getParam(html, null, null, /Выписка по счету:[\s\S]*?<table[^>]*card-table[^>]*>([\s\S]*?)<\/table>/i);
    if(!table){
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена выписка по кредитному счету');
        return;
    }

    result.transactions = [];

    processTable(table, result.transactions, 'credits.transactions.', colsCreditTransactions);
}

function processInfo(html, result){
    var info = result.info = {};

	getParam(html, info, 'info.fio', /<span[^>]+id="clientname"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    if(AnyBalance.isAvailable('info.fam', 'info.name', 'info.pname', 'info.birth_place', 'info.birthday', 'info.inn', 'info.resident')){
        html = AnyBalance.requestGet(g_baseurl + '/services.asp', addHeaders({Referer: g_baseurl + '/index.asp'}));

        getParam(html, info, 'info.fam', /Фамилия:[\s\S]*?<input[^>]+value="([^"]*)/i, replaceHtmlEntities);
        getParam(html, info, 'info.name', /Имя:[\s\S]*?<input[^>]+value="([^"]*)/i, replaceHtmlEntities);
        getParam(html, info, 'info.pname', /Отчество[\s\S]*?<input[^>]+value="([^"]*)/i, replaceHtmlEntities);
        getParam(html, info, 'info.birth_place', /Место рождения[\s\S]*?<input[^>]+value="([^"]*)/i, replaceHtmlEntities);
        getParam(html, info, 'info.birthday', /Дата рождения[\s\S]*?<input[^>]+value="([^"]*)/i, replaceHtmlEntities);
        getParam(html, info, 'info.inn', /ИНН:[\s\S]*?<input[^>]+value="([^"]*)/i, replaceHtmlEntities);
        getParam(html, info, 'info.resident', /Резидентность:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, function(str){return /да/i.test(str)});
    }
    if(AnyBalance.isAvailable('info.contacts')){
        html = AnyBalance.requestGet(g_baseurl + '/services-contacts.asp', addHeaders({Referer: g_baseurl + '/services.asp'}));

        var colsDef = {
            type: {
                re: /Тип/i,
                result_func: function(str){
                    if(/мобил/i.test(str))
                        return 'mobile';
                    if(/эл/i.test(str))
                        return 'email';
                    if(/домаш/i.test(str))
                        return 'home';
                    if(/рабоч/i.test(str))
                        return 'work';
                    return str;
                }
            },
            contact: {
                re: /Контакт/i,
                result_func: null
            }
        };

        var table = getElement(html, /<table[^>]+class="card-table"[^>]*>/i);
        if(table){
            info.contacts = [];
            processTable(table, info.contacts, 'info.contacts.', colsDef);
        }
    }
}

function processDeposits(html, result){
    if(!AnyBalance.isAvailable('deposits'))
        return;

    html = AnyBalance.requestGet(g_baseurl + '/deposits.asp', addHeaders({Referer: g_baseurl + '/index.asp'}));

    var table = getElement(html, /<table[^>]*card-table[^>]*>/i);
    if(!table){
        if(!/На данный момент у Вас нет[^<]*депозитов/i.test(html)) {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти депозиты! Сайт изменен?');
        }else {
            AnyBalance.trace('Нет ни одного депозита');
        }
        return;
    }

    var rows = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
    AnyBalance.trace('Найдено ' + rows.length + ' депозитов');

    result.deposits = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var id = getParam(row, null, null, /<a[^>]+href=["'][^"']*deposit-statement.asp\?id=([^'"&]*)/i, replaceHtmlEntities);
        var name = getParam(row, null, null, /<a[^>]+href=["'][^"']*deposit-statement.asp[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
        var num = getParam(name, null, null, /\d{20}/);

        var c = {
            __id: id,
            __name: name,
            num: num

        };

        if(__shouldProcess('deposits', c)){
            processDeposit(row, c);
        }

        result.deposits.push(c);
    }
}

function processDeposit(tr, result){
    AnyBalance.trace('Обрабатываем депозит ' + result.__name);

    getParam(tr, result, ['deposits.currency', 'deposits.balance', 'deposits.balance_start', 'deposits.transactions'],
        /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'deposits.balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'credits.balance_start', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'deposits.pct', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'deposits.date_end', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'deposits.date_start', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'deposits.name', /<a[^>]+href=["'][^"']*deposit-statement.asp[^>]*>[\s\S]*?<br[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

    var href = getParam(tr, null, null, /<a[^>]+href=["']([^"']*deposit-statement[^'"]*)/i, replaceHtmlEntities);

    if(AnyBalance.isAvailable('deposits.transactions', 'deposits.next_pct')){
        var html = AnyBalance.requestGet(joinUrl(g_baseurl, href), addHeaders({Referer: g_baseurl + '/credits.asp'}));

        getParam(html, result, 'deposits.next_pct', /Дата следующей уплаты процентов:([^<]*)/, replaceTagsAndSpaces, parseDate);

        if(AnyBalance.isAvailable('credits.transactions')){
            processDepositsTransactions(html, result);
        }
    }

    return result;
}

function processDepositsTransactions(html, result){
    var colsDef = {
        date: {
            re: /Дата/i,
            result_func: parseDateSilent,
        },
        descr: {
            re: /Операция/i,
            result_func: null
        },
        sum: {
            re: /Сумма/i,
            result_replace: replaceSign,
            result_func: parseBalanceSilent,
        },
        currency: {
            re: /Валюта/i,
            result_func: null
        }
    };


    var dt = new Date();
    var dtFrom = new Date(dt.getFullYear() - 5, dt.getMonth(), 1);

    var html = AnyBalance.requestPost(g_baseurl + '/deposit-statement.asp', {
        id: getParam(html, null, null, /<input[^>]+name="id"[^>]*value="([^"]*)/i, replaceHtmlEntities),
        fromdate: fmtDate(dtFrom),
        todate: fmtDate(dt)
    }, addHeaders({Referer: g_baseurl + '/deposit-statement.asp'}));

    var table = getElement(html, /<table[^>]+card-table[^>]*>/i);
    if(!table){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти таблицу транзакций депозита!');
        return;
    }

    result.transactions = [];

    var activeCard;
    processTable(table, result.transactions, 'deposita.transactions.', colsDef);
}


function processAccounts(html, result){
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(g_baseurl + '/accounts.asp', addHeaders({Referer: g_baseurl + '/index.asp'}));

    var table = getElement(html, /<table[^>]*card-table[^>]*>/i);
    if(!table){
        if(!/На данный момент у Вас нет[^<]*счетов/i.test(html)) {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти счета! Сайт изменен?');
        }else {
            AnyBalance.trace('Нет ни одного счета');
        }
        return;
    }

    var rows = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
    AnyBalance.trace('Найдено ' + rows.length + ' счетов');

    result.accounts = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var id = getParam(row, null, null, /<a[^>]+href=["'][^"']*account-statement.asp\?id=([^'"&]*)/i, replaceHtmlEntities);
        var name = getParam(row, null, null, /<a[^>]+href=["'][^"']*account-statement[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

        var c = {
            __id: id,
            __name: name,
            num: name

        };

        if(__shouldProcess('accounts', c)){
            processAccount(row, c);
        }

        result.accounts.push(c);
    }
}

function processAccount(tr, result){
    AnyBalance.trace('Обрабатываем счет ' + result.__name);

    getParam(tr, result, ['accounts.currency', 'accounts.balance'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accounts.balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accounts.type', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accounts.status', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    var href = getParam(tr, null, null, /<a[^>]+href=["']([^"']*account-statement[^'"]*)/i, replaceHtmlEntities);

    if(AnyBalance.isAvailable('accounts.transactions')){
        var html = AnyBalance.requestGet(joinUrl(g_baseurl, href), addHeaders({Referer: g_baseurl + '/accounts.asp'}));

        if(AnyBalance.isAvailable('accounts.transactions')){
            processAccountTransactions(html, result);
        }
    }

    return result;
}

function processAccountTransactions(html, result){
    var colsDef = {
        date: {
            re: /Дата/i,
            result_func: parseDateSilent
        },
        descr: {
            re: /Операция/i,
            result_func: null
        },
        sum: {
            re: /Сумма/i,
            result_func: parseBalanceSilent,
        },
        currency: {
            re: /Валюта/i,
            result_func: null
        }
    };

    var dt = new Date();
    var dtFrom = new Date(dt.getFullYear() - 5, dt.getMonth(), 1);

    html = AnyBalance.requestPost(g_baseurl + '/account-statement.asp', {
        id: getParam(html, null, null, /<input[^>]+name="id"[^>]*value="([^"]*)/i, replaceHtmlEntities),
        fromdate: fmtDate(dtFrom),
        todate: fmtDate(dt)
    }, addHeaders({Referer: g_baseurl + '/account-statement.asp'}));


    var table = getParam(html, null, null, /<table[^>]*card-table[^>]*>([\s\S]*?)<\/table>/i);
    if(!table){
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена выписка по счету');
        return;
    }

    result.transactions = [];

    processTable(table, result.transactions, 'accounts.transactions.', colsDef);
}
