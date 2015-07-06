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

var nodeUrl = ''; // Подставляется при авторизации, обычно имеет вид https://node1.online.sberbank.ru/

function login(prefs) {
	var baseurl = "https://online.sberbank.ru/CSAFront/login.do";
	AnyBalance.setDefaultCharset('utf-8');
	
	if (prefs.__debug == 'esk') {
		//Чтобы карты оттестировать
		readEskCards();
		return;
	}
	checkEmpty(prefs.login, "Пожалуйста, укажите логин для входа в Сбербанк-Онлайн!");
	checkEmpty(prefs.password, "Пожалуйста, укажите пароль для входа в Сбербанк-Онлайн!");
	if (prefs.lastdigits && !/^\d{4,5}$/.test(prefs.lastdigits))
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты/счета/кредита, или не указывать ничего", null, true);
	
	//Сбер разрешает русские логины и кодирует их почему-то в 1251, хотя в контент-тайп передаёт utf-8.
	AnyBalance.setDefaultCharset('windows-1251');
	var html = AnyBalance.requestPost(baseurl, {
		'field(login)': prefs.login,
		'field(password)': prefs.password,
		operation: 'button.begin'
	});
	AnyBalance.setDefaultCharset('utf-8');
	
	var error = getParam(html, null, null, /<h1[^>]*>О временной недоступности услуги[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
	
	error = getParam(html, null, null, /в связи с ошибкой в работе системы[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
	
	if (/\$\$errorFlag/i.test(html)) {
		var error = getParam(html, null, null, /([\s\S]*)/, replaceTagsAndSpaces, html_entity_decode);
		throw new AnyBalance.Error(error, null, /Ошибка идентификации/i.test(error));
	}
	
	var page = getParam(html, null, null, /value\s*=\s*["'](https:[^'"]*?AuthToken=[^'"]*)/i);
	if (!page) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам. Пожалуйста, обратитесь к разработчикам для исправления ситуации.");
	}
	
	AnyBalance.trace("About to authorize: " + page);	
	
	if (/esk.zubsb.ru/.test(page)) {
		// html = doOldAccount(page);
	} else if (/online.sberbank.ru\/PhizIC/.test(page)) {
		html = doNewAccount(page);
	} else if (/Off_Service/i.test(page))
		throw new AnyBalance.Error("В настоящее время услуга Сбербанк ОнЛ@йн временно недоступна по техническим причинам. Сбербанк приносит свои извинения за доставленные неудобства.");
	else 
		throw new AnyBalance.Error("К сожалению, ваш вариант Сбербанка-онлайн пока не поддерживается. Пожалуйста, обратитесь к разработчикам для исправления ситуации.");
	
	return html;
}

function doNewAccount(page) {
	var html = AnyBalance.requestGet(page);
	if (/StartMobileBankRegistrationForm/i.test(html)) {
		//Сбербанк хочет, чтобы вы приняли решение о подключении мобильного банка. Откладываем решение.
		var pageToken = getParamByName(html, 'PAGE_TOKEN');
		checkEmpty(pageToken, 'Попытались отказаться от подключения мобильного банка, но не удалось найти PAGE_TOKEN!', true);
		
		html = AnyBalance.requestPost('https://online.sberbank.ru/PhizIC/login/register-mobilebank/start.do', {
			PAGE_TOKEN:pageToken,
			operation: 'skip'
		});
	}
	// А ну другой кейс, пользователь сменил идентификатор на логин
	if(/Ранее вы[^<]*уже создали свой собственный логин для входа/i.test(html)) {
		checkEmpty(null, getParam(html, null, null, /Ранее вы[^<]*уже создали свой собственный логин для входа[^<]*/i, replaceTagsAndSpaces, html_entity_decode));
	}
	
	var baseurl = getParam(page, null, null, /^(https?:\/\/.*?)\//i);
	nodeUrl = baseurl;
	if (/PhizIC/.test(html)) {
		AnyBalance.trace('Entering physic account...: ' + baseurl);
		if (/confirmTitle/.test(html)) {
			var pass = AnyBalance.retrieveCode('Ваш личный кабинет требует одноразовых паролей для входа. Пожалуйста, отмените в настройках кабинета требование одноразовых паролей при входе. Это безопасно: для совершения денежных операций требование одноразового пароля всё равно останется', null, {time: 300000});
			
			html = AnyBalance.requestPost(baseurl + '/PhizIC/async/confirm.do', {
				'receiptNo': '',
				'passwordsLeft': '',
				'passwordNo': '',
				'SID': '',
				'$$confirmSmsPassword': pass,
				'PAGE_TOKEN': getParamByName(html, 'PAGE_TOKEN'),
				'operation': 'button.confirm'
			}, addHeaders({Referer: baseurl}));
			
			
			// throw new AnyBalance.Error("Ваш личный кабинет требует одноразовых паролей для входа. Пожалуйста, отмените в настройках кабинета требование одноразовых паролей при входе. Это безопасно: для совершения денежных операций требование одноразового пароля всё равно останется.");
		}
		if (/internetSecurity/.test(html)) {
			AnyBalance.trace('Требуется принять соглашение о безопасности... Принимаем...');
			
			html = AnyBalance.requestPost(baseurl + '/PhizIC/internetSecurity.do', {
				'field(selectAgreed)': 'on',
				'PAGE_TOKEN': getParamByName(html, 'PAGE_TOKEN'),
				'operation': 'button.confirm'
			}, addHeaders({Referer: baseurl}));
		}
		
		if (/Откроется справочник регионов, в котором щелкните по названию выбранного региона/.test(html)) {
			//Тупой сбер предлагает обязательно выбрать регион оплаты. Вот навязчивость...
			//Ну просто выберем все регионы
			html = AnyBalance.requestPost(baseurl + '/PhizIC/region.do', {
				id: -1,
				operation: 'button.save'
			});
		}
	} else {
		AnyBalance.trace('Entering esk account...');
		var baseurl = 'https://esk.sbrf.ru';
		//self.location.href='/esClient/Default.aspx?Page=1&qs=AuthToken=d80365e0-4bfd-41a1-80a1-b24847ae3e94&i=1'
		var page = getParam(html, null, null, /self\.location\.href\s*=\s*'([^'"]*?AuthToken=[^'"]*)/i);
		if (!page) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам (esk). Пожалуйста, обратитесь к разработчикам для исправления ситуации.");
		}
		var token = getParam(page, null, null, /AuthToken=([^&]*)/i);
		//Переходим в лк esk (Типа логинимся автоматически)
		html = AnyBalance.requestGet(baseurl + page);
		//Зачем-то ещё логинимся 
		html = AnyBalance.requestGet(baseurl + '/esClient/_logon/MoveToCards.aspx?AuthToken=' + token + '&i=1&supressNoCacheScript=1');
		//AnyBalance.trace(html);
		if (AnyBalance.getPreferences().type == 'acc')
			throw new AnyBalance.Error('Ваш тип личного кабинета не поддерживает просмотр счетов. Если вам кажется это неправильным, напишите автору провайдера е-мейл.');
		// readEskCards();
	}
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/list.do');
	var pageToken = getParamByName(html, 'PAGE_TOKEN');
	
	var accounts = getElements(html, /<div[^>]+class="productCover[^"]*Product[^>]*">/ig);
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var _id = getParam(accounts[i], null, null, /<div[^>]+id="account_(\d+)/i);
		var title = getParam(accounts[i], null, null, /<[^>]*class="productNumber\b[^"]*">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('accounts', c)){
			processAccount(accounts[i], _id, c, pageToken);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(html, _id, result, pageToken){
    AnyBalance.trace('Обработка счтеа ' + _id);
	
	getParam(html, result, 'accounts.balance', /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.rate', /descriptionRight[^>]*>\s*([\d.,]+%)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['accounts.currency', 'accounts.balance', 'accounts.cash', 'accounts.electrocash', 'accounts.debt', 'accounts.maxlimit'], /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'accounts.cardNumber', /<[^>]*class="(?:product|account)Number\b[^"]*">([^<,]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.till', /<[^>]*class="(?:product|account)Number\b[^"]*">[^<]+,\s+действует (?:до|по)([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
	
	processAccountTransactions(_id, pageToken, result);
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
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/list.do');
	var cards = getElements(html, /<div[^>]+class="productCover[^"]*activeProduct[^>]*">/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = getParam(cards[i], null, null, /<div[^>]+id="card_(\d+)/i);
		var title = getParam(cards[i], null, null, /<[^>]*class="accountNumber\b[^"]*">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)) {
			processCard(cards[i], _id, c);
		}
		
		result.cards.push(c);
	}
}

function processCard(html, _id, result){
    AnyBalance.trace('Обработка карты ' + _id);
	
	getParam(html, result, 'cards.balance', /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.balance', 'cards.cash', 'cards.electrocash', 'cards.debt', 'cards.maxlimit'], /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'cards.cardNumber', /<[^>]*class="accountNumber\b[^"]*">([^<,]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.till', /<[^>]*class="accountNumber\b[^"]*">[^<]+,\s+действует (?:до|по)([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
	
	if (AnyBalance.isAvailable('cards.userName', 'cards.cash', 'cards.electrocash', 'cards.minpay', 'cards.minpaydate', 'cards.maxlimit')) {
		html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/detail.do?id=' + _id);
		getParam(html, result, 'cards.userName', /Держатель карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, capitalFirstLetters);
		getParam(html, result, 'cards.cash', /Для снятия наличных:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.electrocash', /для покупок:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpay', /Обязательный платеж(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpaydate', /Обязательный платеж(?:[^>]*>){7}([\s\S]*?)<\/div>/, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'cards.maxlimit', /Кредитный лимит(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	// // Нужно только для старого провайдера
	// if (AnyBalance.isAvailable('cards.lastPurchSum', 'cards.lastPurchPlace', 'cards.lastPurchDate')) {
		// html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/info.do?id=' + _id);
		// var tr = getParam(html, null, null, /<tr[^>]*class="ListLine0"[^>]*>([\S\s]*?)<\/tr>/i);
		// if (tr) {
			// getParam(tr, result, 'cards.lastPurchDate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSmallDate);
			// getParam(tr, result, 'cards.lastPurchSum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			// getParam(tr, result, 'cards.lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		// } else {
			// AnyBalance.trace('Не удалось найти последнюю операцию.');
		// }
	// }
	
	processCardLast10Transactions(_id, result);
	processCardTransactions(_id, result);
}

function processCardTransactions(_id, result) {
	if(!AnyBalance.isAvailable('cards.transactions'))
		return;
	
	AnyBalance.trace('Получаем все операции по карте...');
	
	var dt = new Date();
	
	var html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/print.do?sel=c:' + _id + '&fromDateString=' + getFormattedDate(5) + '&toDateString=' + getFormattedDate(), g_headers);
	
	if(!/<table(?:[^>]*>){3}\s*Выписка/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		// processCardLast10Transactions(_id, result);
		return;
	}
	
    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr class="">(?:[^>]*>){15,25}\s*<\/tr>/ig);
	
	var currency = getParam(html, null, null, /Входящий остаток:[^>]*>\s*[\w\s.,-]+([^.]+)/i, replaceTagsAndSpaces);
	
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i) {
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
	// Сортируем в нужном нам порядке, чтобы первой была последняя транзакция
	result.transactions = sortObject(result.transactions, 'time');
}

function processCardLast10Transactions(_id, result) {
	AnyBalance.trace('Получаем последние 10 операций по карте...');
	
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/info.do?id=' + _id);
	
	if(!/<table[^>]*class="tblInf"/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}

    result.transactions10 = [];
	
    var ops = sumParam(html, null, null, /<tr[^>]*class="ListLine\d+">(?:[^>]*>){6}\s*<\/tr>/ig);
	
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i){
    	var o = {};

		getParam(ops[i], o, 'cards.transactions10.sum', /([^>]*>){7}/i, replaceTagsAndSpaces, parseBalance);
		getParam(ops[i], o, 'cards.transactions10.currency', /([^>]*>){7}/i, replaceTagsAndSpaces, parseCurrency);
		getParam(ops[i], o, 'cards.transactions10.name', /([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
    	getParam(ops[i], o, 'cards.transactions10.time', /([^>]*>){5}/i, replaceTagsAndSpaces, parseSmallDate);

    	result.transactions10.push(o);
    }
	
	result.transactions10 = sortObject(result.transactions10, 'time');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processLoans(html, result) {
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/loans/list.do');
	var loans = getElements(html, /<div[^>]+class="productCover[^"]*activeProduct[^>]*">/ig);
	AnyBalance.trace('Найдено кредитов: ' + loans.length);
	result.loans = [];
	
	for(var i=0; i < loans.length; ++i){
		var _id = getParam(loans[i], null, null, /id=(\d+)/i);
		var title = getParam(loans[i], null, null, /<span[^>]*title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('loans', c)) {
			processLoan(loans[i], _id, c);
		}
		result.loans.push(c);
	}
}

function processLoan(html, _id, result){
    AnyBalance.trace('Обработка кредита ' + _id);
	
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/loans/detail.do?id=' + _id);
	
	getParam(html, result, 'loans.balance', /Осталось оплатить:(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['loans.currency', 'loans.balance', 'loans.loan_ammount', 'loans.minpay'], /Осталось оплатить:(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'loans.minpaydate', /Внести до:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'loans.minpay', /"detailAmount"([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'loans.loan_ammount', /Сумма кредита:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'loans.userName', /ФИО заемщика:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, capitalFirstLetters);
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
	
	return day + '/' + month + '/' + year;
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Еще не знаю что это :)
//////////////////////////////////////////////////////////////////////////////////////////////////////////////


function findAndAddField(fields, name){
	for(var i=0; i<fields.length; ++i){
		if(fields[i].name == name)
			return fields[i];
	}

	var f = {name: name};
	fields.push(f);
	return f;
}



