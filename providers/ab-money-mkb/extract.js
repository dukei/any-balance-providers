/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var baseurl = 'https://online.mkb.ru/';

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(!prefs.num || /^\d{4}$/.test(prefs.num), 'Укажите 4 последних цифры или не указывайте ничего, чтобы получить информацию по первому продукту.');

	var html = AnyBalance.requestGet(baseurl + 'secure/main.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
        var form = getElement(html, /<form[^>]+name="login"[^>]*>/i);

        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'txtLogin')
                return prefs.login;
            if (name == 'txtPassword')
                return prefs.password;
            return value;
        });
		html = AnyBalance.requestPost(baseurl + 'secure/login.aspx', params, addHeaders({Referer: baseurl + 'secure/login.aspx'}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (/<input[^>]+name="txtCode"/i.test(html)) {
		AnyBalance.trace("Потребовался ввод кода.");
        var msg = getElement(html, /<p[^>]*msgSMSCode[^>]*/i, replaceTagsAndSpaces, html_entity_decode);
        var form = getElement(html, /<form[^>]+name="login"[^>]*>/i);

        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'txtCode')
                return AnyBalance.retrieveCode((msg || 'Пожалуйста, введите код из SMS для входа в интернет-банк.' ) + '\n\nЧтобы каждый раз не вводить код, вы можете отключить его в своём интернет банке: меню "Настройки системы"/"Настройки информирования"/"Информирование об операциях в системе", затем снять галочку "Запрашивать SMS-код подтверждения при входе". Это безопасно, код подтверждения всё равно будет требоваться для всех операций.', {inputType: 'number', time: 180000});
            return value;
        });

        html = AnyBalance.requestPost(baseurl + 'secure/login.aspx', params, addHeaders({Referer: baseurl + 'secure/login.aspx'}));
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="errMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность указания Логина и Пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    __setLoginSuccessful();
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(baseurl + 'secure/accounts.aspx', g_headers);

	var accounts = getParam(html, null, null, /var\s+accountdata\s*=\s*(\[[^\]]+\])/i, null, getJson);
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var _id = acc.benefacc;
		var title = acc.acctype + ' ' + _id + ' ' + acc.curr;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
	getParam(account.acc, result, 'accounts.num');
    getParam(account.acctype, result, 'accounts.type');
    getParam(account.balance, result, 'accounts.balance', null, null, parseBalance);
    getParam(account.balance, result, ['accounts.currency' , 'accounts.balance'], null, null, parseCurrency);
    getParam(account.date, result, 'accounts.date_start', null, null, parseDateWord);

    var isTransactionsAvailable = isAvailable('accounts.transactions');
    var dt = new Date();
    var dtFrom = new Date(dt.getFullYear() - (isTransactionsAvailable ? 5 : 0), dt.getMonth(), dt.getDate());

    if(isTransactionsAvailable) {
        var html = AnyBalance.requestGet(baseurl + 'secure/ops.aspx?id=' + account.benefacc + '&df=' + fmtDate(dtFrom) + '&dt=' + fmtDate(dt), addHeaders({'Referer': baseurl + 'secure/accounts.aspx'}));

        if(isAvailable('cards.transactions'))
            processAccountTransactions(html, result);
    }
}

function processAccountTransactions(html, result) {
    AnyBalance.trace('Получаем все операции по счету...');

    var table = getElement(html, /<table[^>]+ophistory[^>]*>/i);
    if(!table) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти таблицу операций по счету!');
        return;
    }

    result.transactions = [];

    var colsDef = {
        date: {
            re: /Дата/i,
            result_func: parseDate,
        },
        descr: {
            re: /Детали платежа/i,
            result_process: function(path, td, result){
                var info = this; //Остальные параметры
                getParam(td, result, path + 'descr', /([\s\S]*?)(?:<table|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'acc', /Cчет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'payer', /Плательщик:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'bank', /Банк:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'category', /Категория:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            }
        },
        sum: {
            re: /Сумма/i,
        },
        auth: {
            re: /Номер/i,
            result_func: html_entity_decode,
        },
    };

    processTable(table, result.transactions, 'accounts.transactions.', colsDef);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards', 'bonuses'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'secure/dcards.aspx', g_headers);

	var cardList = getParam(html, null, null, /<table[^>]* class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!cardList){
		//TODO: проверить, что карт действительно нет
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти таблицу с картами.');
		return;
	}

	var cards = sumParam(cardList, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	if(AnyBalance.isAvailable('cards')) {
		result.cards = [];
	}
	
	// Для детальной инфы есть json но в нем нет баланса... мда...
	var cardsJson = getParam(html, null, null, /var\s+carddata\s*=\s*(\[{[\s\S]*?}\])\s*;/i);
	if(cardsJson)
		cardsJson = getJson(cardsJson);
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		if(/bonus.png/i.test(card)){
			AnyBalance.trace('Это не карта, а бонус, получаем баллы...')
			getParam(card, result, 'bonuses', /(<td[^>]*>[\s\S]*?){2}<\/td>/i, replaceTagsAndSpaces, parseBalance);
		}else if(AnyBalance.isAvailable('cards')){
			var _id = getParam(card, null, null, /class="txt"[^>]*>\s*([\d*]+)/i);
			var title = sumParam(card, null, null, /class="txt"[^>]*>\s*([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

			var c = {__id: _id, __name: title};

			if (__shouldProcess('cards', c)) {
				processCard(card, _id, c, cardsJson[i]);
			}

			result.cards.push(c);
		}
	}
}

function processCard(card, _id, result, cardDetailsJson) {
    getParam(card, result, 'cards.balance', /(?:<td[^>]*>[^]*?<\/td>\s*){4}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance'], /(?:<td[^>]*>[^]*?<\/td>\s*){4}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(card, result, 'cards.cardnum', /<div[^>]*class="txt"[^>]*>([\d\*]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, 'cards.type', /(?:<td[^>]*>[^]*?<\/td>\s*){2}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, 'cards.status', /(?:<td[^>]*>[^]*?<\/td>\s*){3}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(cardDetailsJson.cardenddate + '', result, 'cards.till', null, replaceTagsAndSpaces, parseDateWord);
	getParam(cardDetailsJson.cardacc + '', result, 'cards.acc_num');
	getParam(cardDetailsJson.cardopendate + '', result, 'cards.date_start', null, replaceTagsAndSpaces, parseDateWord);
	getParam(cardDetailsJson.cardproduct + '', result, 'cards.type_product');
	getParam(cardDetailsJson.smsstatus + '', result, 'cards.sms_status');
	getParam(cardDetailsJson.smsphone + '', result, 'cards.sms_phone');

	var isTransactionsAvailable = isAvailable('cards.transactions');
	var dt = new Date();
	var dtFrom = new Date(dt.getFullYear() - (isTransactionsAvailable ? 5 : 0), dt.getMonth(), dt.getDate());

	if(isTransactionsAvailable || isAvailable(['cards.needpay', 'cards.gracepay', 'cards.gracepaytill', 'cards.pct', 'cards.credit', 'cards.limit'])) {
		var dt = new Date();
		var html = AnyBalance.requestGet(baseurl + 'secure/cops.aspx?id=' + cardDetailsJson.encSerno + '&df=' + fmtDate(dtFrom, '/') + '&dt=' + fmtDate(dt, '/'), addHeaders({'Referer': baseurl + 'secure/dcards.aspx'}));

		getParam(html, result, 'cards.blocked', /Неоплаченные авторизации:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.pct', /Срочные проценты(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.credit', /Срочный Кредит(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.limit', /Платежный лимит:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.needpay', /Обязательный платеж(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.gracepay', /Отчетная задолженность(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.gracepaytill', /Если Вы желаете воспользоваться условиями льготного кредитования([^<]+)/i, replaceTagsAndSpaces, parseDate);
		
		if(isAvailable('cards.transactions'))
			processCardTransactions(_id, result, html);
	}
}

function processCardTransactions(_id, result, html) {
	AnyBalance.trace('Получаем все операции по карте...');

	var table = getElement(html, /<table[^>]+viewsettingslist[^>]*>/i);
	if(!table) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}
	
    result.transactions = [];

	var colsDef = {
		date: {
			re: /Дата транзакции/i,
			result_func: parseDate,
		},
		date_done: {
			re: /Дата проводки/i,
			result_func: parseDate,
		},
		descr: {
			re: /Содержание операции/i,
			result_process: function(path, td, result){
				var info = this; //Остальные параметры
				getParam(td, result, path + 'descr', /([\s\S]*?)(?:Категория:|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(td, result, path + 'category', /<span[^>]+operCatName[^>]*>[\s\S]*?<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
			}
		},
		sum: {
			re: /Сумма в валюте операции/i,
            result_process: function(path, td, result){
                var info = this; //Остальные параметры
                getParam(td, result, path + 'sum', null, replaceTagsAndSpaces, parseBalance);
                getParam(td, result, path + 'currency', null, replaceTagsAndSpaces, parseCurrency);
            }
		},
		auth: {
			re: /код авто/i,
			result_func: html_entity_decode,
		},
		sum_account: {
			re: /Сумма в валюте счета/i,
		},
	};

	processTable(table, result.transactions, 'cards.transactions.', colsDef);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	var html = AnyBalance.requestGet(baseurl + 'secure/deps.aspx', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]*class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!list){
        //TODO: проверить, что действительно депозитов нет
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти таблицу с депозитами.');
        return;
	}

	var deposits = sumParam(list, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	var detailsJson = getParam(html, null, null, /var\s+depdata\s*=\s*(\[{[\s\S]*?}\])\s*;/i);
	if(detailsJson)
		detailsJson = getJson(detailsJson);
	
	for(var i=0; i < deposits.length; ++i){
        var dep = deposits[i];
		var _id = getParam(dep, null, null, /class="txt"[^>]*>\s*([^<]+)/i, replaceTagsAndSpaces);
		var title = getParam(dep, null, null, /class="txt"(?:[^>]*>){5}\s*([^<]+)/i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(dep, c, detailsJson[i]);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(html, result, detailsJson) {
    getParam(html, result, 'deposits.status', /<td[^>]*CurrentStatus[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(detailsJson.db, result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.db, result, ['deposits.currency', 'deposits.balance'], null, replaceTagsAndSpaces, parseCurrency);
	getParam(detailsJson.dr, result, 'deposits.pct', null, replaceTagsAndSpaces, parseBalance);
	getParam(detailsJson.ac, result, 'deposits.acc_num', null, replaceTagsAndSpaces);
    getParam(detailsJson.ddd, result, 'deposits.period', null, replaceTagsAndSpaces);
    getParam(detailsJson.od, result, 'deposits.date_start', null, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.de, result, 'deposits.date_end', null, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.cap, result, 'deposits.pct_condition');
    getParam(detailsJson.unitcode, result, 'deposits.pct_period');
    getParam(detailsJson.dmil, result, 'deposits.balance_min', null, [replaceTagsAndSpaces, /-|любая/i, 0], parseBalance);
    getParam(detailsJson.dmsi, result, 'deposits.topup_min', null, [replaceTagsAndSpaces, /-|любая/i, 0], parseBalance);
    getParam(detailsJson.dmal, result, 'deposits.balance_max', null, replaceTagsAndSpaces, parseBalance);

    var isTransactionsAvailable = isAvailable('deposits.transactions');
    var dt = new Date();
    var dtFrom = new Date(dt.getFullYear() - (isTransactionsAvailable ? 5 : 0), dt.getMonth(), dt.getDate());

    if(isTransactionsAvailable) {
        var html = AnyBalance.requestGet(baseurl + 'secure/depsops.aspx?id=' + detailsJson.nm + '&df=' + fmtDate(dtFrom) + '&dt=' + fmtDate(dt), addHeaders({'Referer': baseurl + 'secure/accounts.aspx'}));

        if(isAvailable('deposits.transactions'))
            processDepositTransactions(html, result);
    }

}

function processDepositTransactions(html, result) {
    AnyBalance.trace('Получаем все операции по депозиту...');

    var table = getElement(html, /<table[^>]+ophistory[^>]*>/i);
    if(!table) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти таблицу операций по депозиту!');
        return;
    }

    result.transactions = [];

    var colsDef = {
        date: {
            re: /Дата/i,
            result_func: parseDate,
        },
        descr: {
            re: /Детали платежа/i,
            result_process: function(path, td, result){
                var info = this; //Остальные параметры
                getParam(td, result, path + 'descr', /([\s\S]*?)(?:<table|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'acc', /Cчет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'payer', /Плательщик:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'bank', /Банк:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(td, result, path + 'category', /Категория:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            }
        },
        sum: {
            re: /Сумма/i,
        },
        auth: {
            re: /Номер/i,
            result_func: html_entity_decode,
        },
    };

    processTable(table, result.transactions, 'deposits.transactions.', colsDef);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processLoans(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'secure/loans.aspx', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]*class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!list){
		if(/У Вас нет кредитов/i.test(html)){
			AnyBalance.trace('Нет ни одного кредита.');
		}else {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти таблицу с кредитами.');
			return;
		}
	}

	var loans = sumParam(list, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено кредитов: ' + loans.length);
	result.loans = [];
	
	var detailsJson = getParam(html, null, null, /var\s+loanDetailsData\s*=\s*(\[{[\s\S]*?}\])/i);
	if(detailsJson)
		detailsJson = getJson(detailsJson);
	
	for(var i=0; i < loans.length; ++i){
		var _id = getParam(loans[i], null, null, /class="txt"[^>]*>\s*([^<]+)/i, replaceTagsAndSpaces);
		var title = getParam(loans[i], null, null, /class="txt"(?:[^>]*>){6}\s*([^<]+)/i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('loans', c)) {
			processLoan(loans[i], _id, c, detailsJson[i]);
		}
		
		result.loans.push(c);
	}
}

function processLoan(html, _id, result, detailsJson){
    AnyBalance.trace('Обработка кредита ' + _id);
	
	getParam(html, result, 'loans.balance', /(?:[^>]*>){15}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(detailsJson.dt, result, 'loans.minpay', /Сумма ближайшего платежа:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['loans.currency', 'loans.balance', 'loans.minpay'], /(?:[^>]*>){15}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'loans.minpaydate', /(?:[^>]*>){16}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'loans.penalty', /(?:[^>]*>){18}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(detailsJson.dt, result, 'loans.acc_num', /Лицевой счет №:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(detailsJson.dt, result, 'loans.pct', /Текущая процентная ставка по кредиту:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
}

function initCols(colsDef, ths){
	var cols = {};
	for (var i = 0; i < ths.length; i++) {
		var th = ths[i];
		for(var name in colsDef){
			if(colsDef[name].re.test(replaceAll(th, [replaceTagsAndSpaces, replaceHtmlEntities])))
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

function processInfo(result){
    var html = AnyBalance.requestGet(baseurl + 'secure/InformingSettings/OperationsInSystem.aspx', g_headers);
    var info = result.info = {};
    getParam(html, info, 'fio', /<div[^>]+id="statfio"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, info, 'mphone', /<input[^>]+name="[^"]*txtMobileNumber"[^>]*value="([^"]*)/i, null, html_entity_decode);
    getParam(html, info, 'email', /<input[^>]+name="[^"]*txtNotificationEmail"[^>]*value="([^"]*)/i, null, html_entity_decode);
}
