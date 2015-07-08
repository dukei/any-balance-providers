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

	var html = AnyBalance.requestGet(baseurl + 'secure/login.aspx', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'secure/login.aspx', {
		__VIEWSTATE: '',
		__EVENTTARGET: '',
		__EVENTARGUMENT: '',
		txtLogin: prefs.login,
		txtPassword: prefs.password,
		btnLoginStandard: ''
	}, addHeaders({Referer: baseurl + 'secure/login.aspx'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="errMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность указания Логина и Пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    html = AnyBalance.requestGet(baseurl + 'secure/accounts.aspx', g_headers);

	var accounts = getParam(html, null, null, /var\s+accountdata\s*=\s*(\[[^\]]+\])/i, null, getJson);
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var _id = accounts[i].benefacc;
		var title = accounts[i].acctype;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(accounts[i], _id, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, _id, result){
    AnyBalance.trace('Обработка счета ' + _id);
	
	getParam(account.acc, result, 'accounts.cardnum');
    getParam(account.acctype, result, 'accounts.type');
    getParam(account.balance, result, 'accounts.balance', null, null, parseBalance);
    getParam(account.balance, result, ['accounts.currency' , 'accounts.balance'], null, null, parseCurrency);
	
	// processAccountTransactions(_id, pageToken, result);
}

function processAccountTransactions(_id, pageToken, result) {
	if(!AnyBalance.isAvailable('accounts.transactions'))
		return;
	
	AnyBalance.trace('Получаем последние операции по счету...');
	
	var dt = new Date();
	
	html = AnyBalance.requestPost(nodeUrl + '/PhizIC/private/accounts/operations.do?id=' + _id, {
		'showInMain': 'on',
		'filter(typePeriod)': 'period',
		'filter(fromPeriod)': getFormattedDate(5),
		'filter(toPeriod)': getFormattedDate(),
		'$$pagination_size0': '50',
		'PAGE_TOKEN': pageToken,
		'operation': 'button.filter',
	});
	
	if(!/<table[^>]*class="tblInf"/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}

    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr[^>]*class="ListLine\d+">(?:[^>]*>){8}\s*<\/tr>/ig);
	
    AnyBalance.trace('У счета ' + _id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i < ops.length; ++i){
    	var o = {};

		var debit = -1 * (getParam(ops[i], null, null, /([^>]*>){7}/i, replaceTagsAndSpaces, parseBalance) || 0);
		var credit = (getParam(ops[i], null, null, /([^>]*>){9}/i, replaceTagsAndSpaces, parseBalance) || 0);
		
		getParam(debit + credit, o, 'accounts.transactions.sum');
		if(isset(result.currency))
			getParam(result.currency, o, 'accounts.transactions.currency');
		
    	getParam(ops[i], o, 'accounts.transactions.time', /([^>]*>){5}/i, replaceTagsAndSpaces, parseSmallDate);
		getParam(ops[i], o, 'accounts.transactions.name', /([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		
    	result.transactions.push(o);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	var html = AnyBalance.requestGet(baseurl + 'secure/dcards.aspx', g_headers);

	var cardList = getParam(html, null, null, /<table[^>]* class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!cardList){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу с картами.');
	}

	var cards = sumParam(cardList, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	// Для детальной инфы есть json но в нем нет баланса... мда...
	var cardsJson = getParam(html, null, null, /var\s+carddata\s*=\s*(\[{[\s\S]*?}\])\s*;/i);
	if(cardsJson)
		cardsJson = getJson(cardsJson);
	
	for(var i=0; i < cards.length; ++i){
		var _id = getParam(cards[i], null, null, /class="txt"[^>]*>\s*([\d*]+)/i);
		var title = sumParam(cards[i], null, null, /class="txt"[^>]*>\s*([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)) {
			processCard(cards[i], _id, c, cardsJson[i]);
		}
		
		result.cards.push(c);
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
	
	var isTransactionsAvailable = isAvailable('cards.transactions');
	if(isTransactionsAvailable || isAvailable(['cards.needpay', 'cards.gracepay', 'cards.gracepaytill', 'cards.pct', 'cards.credit', 'cards.limit'])) {
		var dt = new Date();
		var html = AnyBalance.requestGet(baseurl + 'secure/cops.aspx?id=' + cardDetailsJson.encSerno + '&df=' + getFormattedDate(isTransactionsAvailable ? 5 : 0) + '&dt=' + getFormattedDate(), addHeaders({'Referer': baseurl + 'secure/dcards.aspx'}));
		
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
	
	if(!/<table(?:[^>]*>){3}\s*Выписка/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}
	
    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr[^>]*>\s*<td[^>]*>\d{1,2}.\d{1,2}.\d{2,4}(?:[^>]*>){15,30}<\/tr>/ig);
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
	
    for(var i=0; i<ops.length; ++i) {
    	var o = {};
		
		getParam(ops[i], o, 'cards.transactions.time', /\d{1,2}\.\d{1,2}\.\d{2,4}/i, replaceTagsAndSpaces, parseDate);
		getParam(ops[i], o, 'cards.transactions.name', /(?:<td>[\s\S]*?){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		getParam(ops[i], o, 'cards.transactions.sum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		
    	result.transactions.push(o);
    }
	// Сортируем в нужном нам порядке, чтобы первой была последняя транзакция
	result.transactions = sortObject(result.transactions, 'time');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	var html = AnyBalance.requestGet(baseurl + 'secure/deps.aspx', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]*class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!list){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу с депозитами.');
	}

	var deposits = sumParam(list, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	var cardsJson = getParam(html, null, null, /var\s+depdata\s*=\s*(\[{[\s\S]*?}\])\s*;/i);
	if(cardsJson)
		cardsJson = getJson(cardsJson);
	
	for(var i=0; i < deposits.length; ++i){
		var _id = getParam(deposits[i], null, null, /class="txt"[^>]*>\s*([^<]+)/i, replaceTagsAndSpaces);
		var title = getParam(deposits[i], null, null, /class="txt"(?:[^>]*>){5}\s*([^<]+)/i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], _id, c, cardsJson[i]);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(card, _id, result, cardDetailsJson) {
    getParam(cardDetailsJson.db, result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(cardDetailsJson.db, result, ['deposits.currency', 'deposits.balance'], null, replaceTagsAndSpaces, parseCurrency);
}

function processDepositTransactions(_id, result, html) {
	AnyBalance.trace('Получаем все операции по депозиту...');
	
	if(!/<table(?:[^>]*>){3}\s*Выписка/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}
	
    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr[^>]*>\s*<td[^>]*>\d{1,2}.\d{1,2}.\d{2,4}(?:[^>]*>){15,30}<\/tr>/ig);
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
	
    for(var i=0; i<ops.length; ++i) {
    	var o = {};
		
		getParam(ops[i], o, 'cards.transactions.time', /\d{1,2}\.\d{1,2}\.\d{2,4}/i, replaceTagsAndSpaces, parseDate);
		getParam(ops[i], o, 'cards.transactions.name', /(?:<td>[\s\S]*?){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		getParam(ops[i], o, 'cards.transactions.sum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		
    	result.transactions.push(o);
    }
	// Сортируем в нужном нам порядке, чтобы первой была последняя транзакция
	result.transactions = sortObject(result.transactions, 'time');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processLoans(html, result) {
	var html = AnyBalance.requestGet(baseurl + 'secure/loans.aspx', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]*class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!list){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу с кредитами.');
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Шаблоны
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processTemplates(html, result) {
	if(!AnyBalance.isAvailable('templates'))
		return;

	result.templates = [];
	
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/favourite/list/PaymentsAndTemplates.do');
	
	var tpls = sumParam(html, null, null, /<li[^>]+class="listLine"(?:[^>]*>){200,300}\s*<\/li>/ig);
	AnyBalance.trace('Найдено шаблонов и черновиков: ' + tpls.length)

	var tpls_done = {};
	for(var i=0; i<tpls.length; ++i){
		var id = getParam(tpls[i], null, null, /editTemplate\((\d+)\)/i, replaceTagsAndSpaces);
		var name = getParam(tpls[i], null, null, /"sortNameBreak"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);		
		var serviceTemplate = /servicesPayments/i.test(tpls[i]);
		
		if(tpls_done[id]) {
			AnyBalance.trace('Шаблон ' + name + ' (' + id + ') уже обработан, пропускаем');
			continue;
		}

		var t = {__id: id, __name: name, serviceTemplate: serviceTemplate};

		if(__shouldProcess('templates', t)){
			processTemplate(t, id);
			tpls_done[id] = true;
		}
		result.templates.push(t);
	}
}

function processTemplate(result, _id) {
	AnyBalance.trace('Обработка шаблона ' + _id);
	
	if(isAvailable(['balance', 'account', 'dest', 'date'])) {
		if(result.serviceTemplate) {
			html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/template/services-payments/edit.do?id=' + _id);
			
			getParam(html, result, 'balance', /field\(amount\)(?:[^"]*"){3}([\d.,]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'account', /field\(RecIdentifier\)(?:[^"]*"){3}([\d]+)/i, replaceTagsAndSpaces);
			
			
			getParam('Service template', result, 'dest', null, replaceTagsAndSpaces);
		} else {
			html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/payments/template.do?id=' + _id);
			
			getParam(html, result, 'balance', /value="([^"]+)"[^>]*name="[^"]*sellAmount/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'account', /value="([^"]+)"[^>]*name="[^"]*CardNumber/i, replaceTagsAndSpaces);
			getParam(html, result, 'dest', /activeButton"([^>]*>){2}/i, replaceTagsAndSpaces);
		}
		
		getParam(html, result, 'date', /userEmail"([^>]*>){2}/i, replaceTagsAndSpaces, parseSmallDate);
	}	
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Профиль пользователя
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processProfile(html, result) {
	AnyBalance.trace('Разбираем профиль...');
	
	if(isAvailable(['fio', 'phone', 'email', 'passport'])) {
		html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/userprofile/userSettings.do');
		
		getParam(html, result, 'fio', /"userFIO"([^>]*>){2}/i, replaceTagsAndSpaces, capitalFirstLetters);
		getParam(html, result, 'phone', /"phoneNumber"([^>]*>){2}/i, replaceTagsAndSpaces);
		getParam(html, result, 'email', /userEmail"([^>]*>){2}/i, replaceTagsAndSpaces, capitalFirstLetters);
		getParam(html, result, 'passport', /Паспорт гражданина РФ([^>]*>){5}/i, replaceTagsAndSpaces);
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Всякие вспомогательные функции
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function sortObject(objArray, sortField) {
	return objArray.sort(function sortFunction(a, b) {
		if(a[sortField] > b[sortField])
			return -1;
		
		if(a[sortField] < b[sortField])
			return 1;
		
		return 0
	});
}

function getFormattedDate(yearCorr) {
	var dt = new Date();
	
	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth()+1) < 10 ? '0' + (dt.getMonth()+1) : dt.getMonth()+1);
	var year = isset(yearCorr) ? dt.getFullYear() - yearCorr : dt.getFullYear();
	
	return day + '.' + month + '.' + year;
}

function getParamByName(html, name) {
    return getParam(html, null, null, new RegExp('name=["\']' + name + '["\'][^>]*value=["\']([^"\']+)"', 'i'));
}

function processRates(html, result) {
	AnyBalance.trace('Fetching rates...');
	
	getParam(html, result, 'eurPurch', /"currencyRateName"[^>]*>EUR(?:[^>]*>){2}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'eurSell', /"currencyRateName"[^>]*>EUR(?:[^>]*>){5}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'usdPurch', /"currencyRateName"[^>]*>USD(?:[^>]*>){2}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'usdSell', /"currencyRateName"[^>]*>USD(?:[^>]*>){5}([^<]*)/i, null, parseBalance);
}

function fetchNewThanks(baseurl, result) {
	AnyBalance.trace('Попробуем получить Спасибо от сбербанка...');
	if (AnyBalance.isAvailable('spasibo')) {
		html = AnyBalance.requestGet(baseurl + '/PhizIC/private/async/loyalty.do');
		
		var href = getParam(html, null, null, /^\s*(https?:\/\/\S*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (!href) {
			AnyBalance.trace('Не удаётся получить ссылку на спасибо от сбербанка: ' + html);
		} else {
			html = AnyBalance.requestGet(href);
			getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		}
	}
}

function parseSmallDate(str) {
    var dt = parseSmallDateInternal(str);
    AnyBalance.trace('Parsed small date ' + new Date(dt) + ' from ' + str);
    return dt;
}

function parseSmallDateInternal(str) {
	//Дата
    var matches = str.match(/(\d+):(\d+)/) || [,0,0];
	var now = new Date();
	if (/сегодня/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +matches[1], +matches[2], 0);
		return date.getTime();
	} else if (/вчера/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, +matches[1], +matches[2], 0);
		return date.getTime();
	} else {
		var matches = /(\d+)[^\d]+(\d+)/i.exec(str);
		if (!matches) {
			AnyBalance.trace('Не удалось распарсить дату: ' + str);
		} else {
			var year = now.getFullYear();
			if (now.getMonth() + 1 < +matches[2])--year; //Если текущий месяц меньше месяца последней операции, скорее всего, то было за прошлый год
			var date = new Date(year, +matches[2] - 1, +matches[1]);
			return date.getTime();
		}
	}
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Мобильное API
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function requestApi(action, params, dontAddDefParams, url, ignoreErrors) {
	var baseurl = (url || 'https://online.sberbank.ru:4477/CSAMAPI/');
	return requestApi2(baseurl + action, params, !dontAddDefParams, ignoreErrors);
}

function requestApi2(url, params, addDefParams, ignoreErrors) {
	var m_headers = {
		'Connection': 'keep-alive',
		'User-Agent': 'Mobile Device',
		'Origin':'',
	};
	
	if(!addDefParams) {
		var newParams = params;
	} else {
		var newParams = joinObjects(params, {
			'version':'7.00',
			'appType':'android',
			'appVersion':'2014060500',
			'deviceName':'AnyBalanceAPI',
		});
	}
	// регистрируем девайс
	var html = AnyBalance.requestPost(url, newParams, m_headers);
	// Проверим на правильность

	var code = getParam(html, null, null, /<status>\s*<code>(-?\d+)<\/code>/i, null, parseBalance);
	
	if(!/<status>\s*<code>0<\/code>/i.test(html)) {
		AnyBalance.trace(html);
		if(!ignoreErrors){
			var error = sumParam(html, null, null, /<error>\s*<text>\s*<!(?:\[CDATA\[)?([\s\S]*?)(?:\]\]>)\s*<\/text>\s*<\/error>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
			var ex = new AnyBalance.Error(error || "Ошибка при обработке запроса!", null, /неправильный идентификатор/i.test(error));
			ex.code = code;
			throw ex;
		}
	}
	return html;
}

function getToken(html) {
	var token = getParam(html, null, null, /<token>([^<]+)<\/token>/i);
	if(!token) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось найти токен авторизации, сайт изменен?");
	}
	return token;
}

var baseurlAPI = 'https://node1.online.sberbank.ru:4477/mobile7/';

function loginAPI(prefs) {
	if(AnyBalance.getLevel() < 9) {
		throw new AnyBalance.Error('Для использования API мобильного приложения необходим AnyBalance API v9!');
	}
	
	var defaultPin = '11223';
	
	/*html = requestApi('checkPassword.do', {
		'operation':'check',
		'password':defaultPin
	}, true, 'https://node1.online.sberbank.ru:4477/mobile7/', true);
	*/
	// Здесь нужно узнать, нужна ли привязка
	var guid = AnyBalance.getData('guid', '');
	if(guid) {
		AnyBalance.trace('Устройство уже привязано!');
		AnyBalance.trace('guid is: ' + guid);
		
		try{
			html = requestApi2('https://online.sberbank.ru:4477/CSAMAPI/login.do', {
				'operation':'button.login',
				'mGUID':guid,
				'isLightScheme':'true',
				'devID':hex_md5(prefs.login)
			}, true);
		}catch(e){
			if(e.code == 7){
			     //Приложение не зарегистрировано. Надо перегенерить гуид
			     AnyBalance.trace(e.message + ": Надо перегенерить guid");
			     guid = null;
			}else{
				throw e;
			}
		}
	}

	if(!guid){
		AnyBalance.trace('Необходимо привязать устройство!');
		
		// Сбер стал блокировать одинаковые девайсы, перепривязывая их по новой.
		// Придется сделать так
		var devID = hex_md5(prefs.login + ' ' + Math.random());
		// регистрируем девайс
		var html = requestApi('registerApp.do', {
			'operation':'register',
			'login':prefs.login,
			'devID':devID
		});
		
		var mGUID = getParam(html, null, null, /<mGUID>([\s\S]*?)<\/mGUID>/i);
		if(!mGUID) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error("Не удалось найти токен регистрации, сайт изменен?");
		}
		
		AnyBalance.setData('guid', mGUID);
		AnyBalance.trace('mGUID is: ' + mGUID);
		//AnyBalance.saveData(); Нельзя здесь сохранять! Только после успешного ввода кода!

		// Все, тут надо дождаться смс кода
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из смс, для привязки данного устройства.', null, {
			time: 120000,
			inputType: 'number',
		});
		
		html = requestApi('registerApp.do', {
			'operation':'confirm',
			'mGUID':mGUID,
			'smsPassword':code,
		});
		AnyBalance.trace('Успешно привязали устройство. Создадим PIN...');
		
		html = requestApi('registerApp.do', {
			'operation':'createPIN',
			'mGUID':mGUID,
			'password':defaultPin,
			'isLightScheme':'true',
			'devID':devID
		});

		AnyBalance.saveData();
		var token = getToken(html);
	}
	
	var result = {success: true};
	
	html = requestApi2(baseurlAPI + 'postCSALogin.do', {'token':getToken(html)});
	
	getParam(html, result, 'userName', /<surName>([\s\S]*)<\/(?:patrName|firstName)>/i, replaceTagsAndSpaces, capitalFirstLetters);
	
	html = requestApi2(baseurlAPI + 'checkPassword.do', {'operation':'check','password':defaultPin});
	
	// // Курсы валют
	// if(isAvailable(['eurPurch', 'eurSell', 'usdPurch', 'usdSell'])) {
		// AnyBalance.trace('Fetching rates...');
		// html = requestApi2(baseurlAPI + 'private/rates/list.do');
		
		// getParam(html, result, 'eurPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>EUR/i, null, parseBalance);
		// getParam(html, result, 'eurSell', /EUR<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);
		// getParam(html, result, 'usdPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>USD/i, null, parseBalance);
		// getParam(html, result, 'usdSell', /USD<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);		
	// }
	
	// // Получим продукты
	return html = requestApi2(baseurlAPI + 'private/products/list.do', {showProductType:'cards,accounts,imaccounts'});
	
	// if (prefs.type == 'acc')
		// throw new AnyBalance.Error('Получение счетов пока не поддерживается, свяжитесь с разработчиками!');
	// else
		// fetchApiCard(html, result, prefs);
	
	// AnyBalance.setResult(result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка API карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAPICards(html, result) {
	fetchAPIThanks(result);
	
	
	var cards = getElements(html, /<card>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = getParam(cards[i], null, null, /<id>([^<]+)/i);
		var title = getParam(cards[i], null, null, /<number>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processAPICard(cards[i], _id, c);
		}
		result.cards.push(c);
	}
}

function processAPICard(html, _id, result){
    AnyBalance.trace('Обработка карты ' + _id);
	
	getParam(html, result, 'cards.balance', /<amount>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.balance', 'cards.cash', 'cards.electrocash', 'cards.debt', 'cards.maxlimit'], /<currency>(?:[^>]*>){1,3}\s*<name>([^<.]+)/i, replaceTagsAndSpaces);
	
	// getParam(html, result, 'cards.cardNumber', /<[^>]*class="accountNumber\b[^"]*">([^<,]+)/i, replaceTagsAndSpaces);
	// getParam(html, result, 'cards.till', /<[^>]*class="accountNumber\b[^"]*">[^<]+,\s+действует (?:до|по)([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
	
	// if (AnyBalance.isAvailable('cards.userName', 'cards.cash', 'cards.electrocash', 'cards.minpay', 'cards.minpaydate', 'cards.maxlimit')) {
		// html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/detail.do?id=' + _id);
		// getParam(html, result, 'cards.userName', /Держатель карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, capitalFirstLetters);
		// getParam(html, result, 'cards.cash', /Для снятия наличных:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		// getParam(html, result, 'cards.electrocash', /для покупок:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		// getParam(html, result, 'cards.minpay', /Обязательный платеж(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		// getParam(html, result, 'cards.minpaydate', /Обязательный платеж(?:[^>]*>){7}([\s\S]*?)<\/div>/, replaceTagsAndSpaces, parseDateWord);
		// getParam(html, result, 'cards.maxlimit', /Кредитный лимит(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	// }
	
	// processCardTransactions(_id, result);
}

function processAPICardTransactions(_id, result) {
	if(!AnyBalance.isAvailable('cards.transactions'))
		return;
	
	AnyBalance.trace('Получаем последние операции по карте...');
	
	var dt = new Date();
	
	var html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/print.do?sel=c:' + _id + '&fromDateString=' + getFormattedDate(5) + '&toDateString=' + getFormattedDate(), g_headers);

	if(!/<table(?:[^>]*>){3}\s*Выписка/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций! Пробуем другой вариант выписки...');
		processCardLast10Transactions(_id, result);
		return;
	}

    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr class="">(?:[^>]*>){15,25}\s*<\/tr>/ig);
	
	var currency = getParam(html, null, null, /Входящий остаток:[^>]*>\s*[\w\s.,-]+([^.]+)/i, replaceTagsAndSpaces);
	
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i){
    	var o = {};

		var debit = -1 * (getParam(ops[i], null, null, /debit([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance) || 0);
		var credit = (getParam(ops[i], null, null, /credit([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance) || 0);
		
		getParam(debit + credit, o, 'cards.transactions.sum');
		getParam(currency, o, 'cards.transactions.currency');
		
    	getParam(ops[i], o, 'cards.transactions.time', /operationDate([^>]*>){2}/i, replaceTagsAndSpaces, parseDate);
		getParam(ops[i], o, 'cards.transactions.orderNum', /documentNumber([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(ops[i], o, 'cards.transactions.correspond', /accNumber([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(ops[i], o, 'cards.transactions.name', /operationDate([^>]*>){8}/i, replaceTagsAndSpaces, html_entity_decode);
		
    	result.transactions.push(o);
    }
}

function processAPICardLast10Transactions(_id, result) {
	AnyBalance.trace('Получаем последние 10 операций по карте...');
	
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/info.do?id=' + _id);
	
	if(!/<table[^>]*class="tblInf"/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}

    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr[^>]*class="ListLine\d+">(?:[^>]*>){6}\s*<\/tr>/ig);
	
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i){
    	var o = {};

		getParam(ops[i], o, 'cards.transactions.sum', /([^>]*>){7}/i, replaceTagsAndSpaces, parseBalance);
		getParam(ops[i], o, 'cards.transactions.currency', /([^>]*>){7}/i, replaceTagsAndSpaces, parseCurrency);
		getParam(ops[i], o, 'cards.transactions.name', /([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
    	getParam(ops[i], o, 'cards.transactions.time', /([^>]*>){5}/i, replaceTagsAndSpaces, parseSmallDate);

    	result.transactions.push(o);
    }
}

function fetchApiCard(html, result, prefs) {
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего", null, true);
	
	var digits = '';
	if(prefs.lastdigits) {
		for(var i = 0; i < prefs.lastdigits.length; i++) {
			var сhar = prefs.lastdigits[i]
			digits += сhar + '\\s*';
		}
	}
	
	//<card>(?:[^>]*>){6,10}\s*<number>[\s\d*]+55 82[\s\S]*?<\/card>
	var card = getParam(html, null, null, new RegExp('<card>(?:[^>]*>){6,10}\\s*<number>[\\s\\d*]+' + digits + '[\\s\\S]*?</card>'));
	
	if(!card) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты!'));
	}
	
	getParam(card, result, 'balance', /<amount>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cardNumber', /<number>([^<]+)/i, replaceTagsAndSpaces);
	getParam(card, result, '__tariff', /<number>([^<]+)/i, replaceTagsAndSpaces);
	getParam(card, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], /code>\s*<name>([^<]+)/i, [replaceTagsAndSpaces, /\./, '']);
	getParam(card, result, 'status', /<state>([^<]+)/i, [replaceTagsAndSpaces, /active/i, 'Активная']);
	//getParam(card, result, 'till', reCardTill, replaceTagsAndSpaces, parseDateWord);
	
	var id = getParam(card, null, null, /<id>([^<]+)/i)
	if (AnyBalance.isAvailable('cash', 'electrocash', 'minpay', 'minpaydate', 'maxlimit')) {
		html = requestApi2('https://node1.online.sberbank.ru:4477/mobile7/private/cards/info.do', {'id':id});
		
		//getParam(html, result, ' ', /<holderName>([^<]+)/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
		getParam(html, result, 'cash', /<availableCashLimit>([\s\S]+?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'electrocash', /<purchaseLimit>([\s\S]+?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
		
		// Еще не знаю как это будет выглядеть
		//getParam(html, result, 'minpay', /Минимальный платеж:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'maxlimit', /Кредитный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'minpaydate', /Дата минимального платежа:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseDateForWord);
	}
	
	if (isAvailable(['lastPurchSum', 'lastPurchPlace', 'lastPurchDate'])) {
		try {
			html = requestApi2('https://node1.online.sberbank.ru:4477/mobile7/private/cards/abstract.do', {'id':id, count:10, paginationSize:10});
			
			getParam(html, result, 'lastPurchDate', /<operation><date>([^<]+)/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'lastPurchSum', /<amount>([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'lastPurchPlace', /<description><\!\[CDATA\[([^\]]+)/i, replaceTagsAndSpaces);
		} catch(e) {
			AnyBalance.trace('Не удалось получить выписку: ' + e.message);
		}
	}
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Всякая фигня для API 
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function fetchAPIThanks(result) {
	// Спасибо
	if (AnyBalance.isAvailable('spasibo')) {
		html = requestApi2(baseurlAPI + 'private/profile/loyaltyURL.do');
		
		var url = getParam(html, null, null, /<url>([^<]{10,})/i, replaceTagsAndSpaces, html_entity_decode);
		if(url) {
			html = AnyBalance.requestGet(url);
			getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		} else {
			AnyBalance.trace("Не удалось найти ссылку на программу спасибо, сайт изменен?");
		}
	}
}