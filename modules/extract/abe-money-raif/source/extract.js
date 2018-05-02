/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 8.0.0; ONEPLUS A3010 Build/OPR6.170623.013)',
	Accept: 'application/json',
	'RC-Device': 'android',
	'Connection': 'close',
	'Accept-Language': 'ru'
};

var g_baseurl = 'https://online.raiffeisen.ru/';
var g_token;
var g_loginInfo;

function callApi(verb, params){
	if(!g_token && verb != 'oauth/token')
		throw new AnyBalance.Error('Внутренняя ошибка, сайт изменен?');

	var headers;
	if(!g_token){
		headers = addHeaders({Authorization: 'Basic b2F1dGhVc2VyOm9hdXRoUGFzc3dvcmQhQA=='}); 
	}else{
		headers = addHeaders({Authorization: 'Bearer ' + g_token}); 
	}
	if(params)
		headers['Content-Type'] = 'application/json'; 

	var html = AnyBalance.requestPost(g_baseurl + verb, params && JSON.stringify(params), headers, {HTTP_METHOD: params ? 'POST' : 'GET'});

	if(AnyBalance.getLastStatusCode() == 401){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Отказ в доступе. Неправильный логин или пароль?', null, true);
	}

	if(AnyBalance.getLastStatusCode() >= 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка вызова API ' + verb + ': ' + AnyBalance.getLastStatusCode());
	}

	var json = getJson(html);
	return json;
}

function login(result) {
	var prefs = AnyBalance.getPreferences();

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	if(!g_token){
		var json = callApi('oauth/token', {
			"grant_type":"password",
			"password":prefs.password,
			"platform":"android",
			"username":prefs.login,
			"version":"497"
		});

		g_token = json.access_token;
		g_loginInfo = json;
	}
}

function processInfo(result){
	if(AnyBalance.isAvailable('info')){
		result.info = {};

		var json = g_loginInfo;
		if(!json)
			throw new AnyBalance.Error('Не удаётся получить общую информацию');
	    
		getParam(json.resource_owner.fullName, result.info, 'info.fio');
		getParam(json.resource_owner.birthDate, result.info, 'info.birthday', null, null, parseDateISO);
		getParam(json.resource_owner.address, result.info, 'info.address');
		getParam(json.resource_owner.mobilePhone, result.info, 'info.mphone');
		getParam(json.resource_owner.email, result.info, 'info.email');
		getParam(json.resource_owner.passportNumber, result.info, 'info.passport');
		getParam(json.resource_owner.passportIssuer, result.info, 'info.passportissuer');
		getParam(json.resource_owner.passportDate, result.info, 'info.passportissuedate', null, null, parseDateISO);
		getParam(json.username, result.info, 'info.login');
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(result) {
	if (!isAvailable('cards'))
		return;

	var cards = callApi('rest/card?alien=false');

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];

	for (var i = 0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.id;
		var title = card.paymentSystem.name + ' ' + card.pan.substr(-4);

		var c = {__id: _id, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(info, result) {
	getParam(info.balance, result, 'cards.balance');
	getParam(info.currencyId, result, ['cards.currency', 'cards.balance', 'cards.minpay', 'cards.limit', 'cards.totalCreditDebtAmount', 'cards.blocked']);

//	getParam(info, result, 'cards.minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
//	getParam(info, result, 'cards.limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
	// getParam(info, result, 'cards.totalCreditDebtAmount', /<totalCreditDebtAmount>([\s\S]*?)<\/totalCreditDebtAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info.hold, result, 'cards.blocked');
	getParam(info.type.id, result, 'cards.type_code'); //1
	getParam(info.type.name, result, 'cards.type'); //Debit card

	getParam(info.pan, result, 'cards.num');
	getParam(info.account.cba, result, 'cards.accnum');
//	getParam(info, result, 'cards.minpay_till', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
//	getParam(info, result, 'cards.till', /<expirationDate>([\s\S]*?)<\/expirationDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info.status.name, result, 'cards.status'); //Open
	getParam(info.product, result, 'cards.name');
	getParam(info.cardholder, result, 'cards.holder');
//	getParam(info., result, 'cards.isCorporate', /<isCorporate>([\s\S]*?)<\/isCorporate>/i, replaceTagsAndSpaces, parseBoolean);
	getParam(info.main.id == 1, result, 'cards.isMain');
	getParam(info.open, result, 'cards.dateStart', null, null, parseDateISO);
	getParam(info.paymentSystem.name, result, 'cards.shortType');

	// Кредитные карты
/*	if (type == '3' && (isAvailable(['cards.totalCreditDebtAmount', 'cards.clearBalance', 'cards.own']) || isAvailableButUnset('cards.limit') || isAvailableButUnset('cards.minpay'))) {
		var html = AnyBalance.requestPost(baseurl + 'RCCardService', '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://entry.rconnect/xsd" xmlns:ser="http://service.rconnect" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header /><soapenv:Body><ser:getCreditStatementPeriods2><cardId>' + result.__id + '</cardId></ser:getCreditStatementPeriods2></soapenv:Body></soapenv:Envelope>', addHeaders({SOAPAction: ''}));

		var returns = getElements(html, /<return/ig);
		//Надо брать последний период
		var ret = returns[returns.length-1];

		var id = getParam(ret, null, null, /<id>([\s\S]*?)<\/id>/i, replaceTagsAndSpaces);
		var prime = getParam(ret, null, null, /<prime>([\s\S]*?)<\/prime>/i, replaceTagsAndSpaces);

		if (prime && id) {
			html = AnyBalance.requestPost(baseurl + 'RCCardService', '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://entry.rconnect/xsd" xmlns:ser="http://service.rconnect" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header /><soapenv:Body><ser:getCurrentCreditStatement><cardId>' + result.__id + '</cardId><id>' + id + '</id><isPrime>' + prime + '</isPrime></ser:getCurrentCreditStatement></soapenv:Body></soapenv:Envelope>', addHeaders({SOAPAction: ''}));

			var limit = getParam(html, null, null, /<availableCreditLimit>([\s\S]*?)<\/availableCreditLimit>/i, replaceTagsAndSpaces, parseBalance);
			var ownFunds = getParam(html, null, null, /<ownFunds>([\s\S]*?)<\/ownFunds>/i, replaceTagsAndSpaces, parseBalance);

			getParam(limit, result, 'cards.limit');
			getParam(ownFunds, result, 'cards.own');
			// баланс - Лимит
			getParam(balance - limit, result, 'cards.clearBalance');

			getParam(html, result, 'cards.totalCreditDebtAmount', /<totalDebtAmount>([\s\S]*?)<\/totalDebtAmount>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.minpay', /<minAmount>([\s\S]*?)<\/minAmount>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.gracePeriodOutstanding', /<gracePeriodOutstanding>([\s\S]*?)<\/gracePeriodOutstanding>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.gracepay', /<unpaidGracePeriodDue>([\s\S]*?)<\/unpaidGracePeriodDue>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.gracepay_till', /<gracePeriodEnd>([\s\S]*?)<\/gracePeriodEnd>/i, replaceTagsAndSpaces, parseDateISO);

			/*
			 <availableCreditLimit>155000.000</availableCreditLimit>
			 <card_id>6601272</card_id>
			 <endDate>2015-11-20T12:53:23.829+03:00</endDate>
			 <gracePeriodEnd>2015-11-27T00:00:00.000+03:00</gracePeriodEnd>
			 <gracePeriodOutstanding>0.000</gracePeriodOutstanding>
			 <id>249007617</id>
			 <intrestOutstanding>0.000</intrestOutstanding>
			 <minAmount>0.000</minAmount>
			 <overlimit>0</overlimit>
			 <ownFunds>0.000</ownFunds>
			 <pastDueInterestOutstanding>0</pastDueInterestOutstanding>
			 <pastDuePrincipalOutstanding>0.000</pastDuePrincipalOutstanding>
			 <paymentHolidays>false</paymentHolidays>
			 <prevStatementTotalDebt>0.000</prevStatementTotalDebt>
			 <prime>true</prime>
			 <startDate>2015-11-07T00:00:00.000+03:00</startDate>
			 <totalCredit>0.000</totalCredit>
			 <totalDebit>0.000</totalDebit>
			 <totalDebtAmount>0.000</totalDebtAmount>
			 <unpaidGracePeriodDue>0.000</unpaidGracePeriodDue>
			 * /
		} else {
			AnyBalance.trace('Не удалось найти доп информацию по карте ' + result.__name);
			AnyBalance.trace(html);
		}
	}
*/
	if (typeof processCardTransactions != 'undefined')
		processCardTransactions(info, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
	if (!isAvailable('accounts'))
		return;

	var cards = callApi('rest/account?alien=false');

	AnyBalance.trace('Найдено счетов: ' + cards.length);
	result.accounts = [];

	for (var i = 0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.id;
		var title = card.type.name + ' ' + card.currencyId + ' ' + card.cba;

		var c = {__id: _id, __name: title};

		if (__shouldProcess('accounts', c)) {
			processAccount(cards[i], c);
		}

		result.accounts.push(c);
	}
}

function processAccount(info, result) {
	getParam(info.balance, result, 'accounts.balance');
	getParam(info.hold, result, 'accounts.blocked');
	getParam(info.currencyId, result, ['accounts.currency', 'accounts.minpay', 'accounts.limit', 'accounts.balance']);
	getParam(info.cba, result, 'accounts.num');
//	getParam(info, result, 'accounts.minpay_till', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
//	getParam(info, result, 'accounts.minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
//	getParam(info, result, 'accounts.limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
//	getParam(info, result, 'accounts.till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info.open, result, 'accounts.date_start', null, null, parseDateISO);
//	getParam(info.type.name, result, 'accounts.accountSubtypeName');
	getParam(info.type.name, result, 'accounts.type');
//	getParam(info., result, 'accounts.region', /<region>([\s\S]*?)<\/region>/i, replaceTagsAndSpaces);
//	getParam(info, result, 'accounts.owner_id', /<owner_id>([\s\S]*?)<\/owner_id>/i, replaceTagsAndSpaces);
//	getParam(info, result, 'accounts.branchId', /<branchId>([\s\S]*?)<\/branchId>/i, replaceTagsAndSpaces);

	if (typeof processAccountTransactions != 'undefined')
		processAccountTransactions(info, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(result) {
	if (!isAvailable('deposits'))
		return;

	var cards = callApi('rest/deposit?alien=false');

	AnyBalance.trace('Найдено депозитов: ' + cards.length);
	result.deposits = [];

	for (var i = 0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.id;
		var title = card.product.name.name + ' ' + card.deals[0].currencyId + ' ' + card.number;

		var c = {__id: _id, __name: title};

		if (__shouldProcess('deposits', c)) {
			processDeposit(cards[i], c);
		}

		result.deposits.push(c);
	}
}

function processDeposit(info, result) {
	getParam(info.deals[0].cba, result, 'deposits.num');
	getParam(info.deals[0].currentAmount, result, 'deposits.balance');
	getParam(info.deals[0].startAmount, result, 'deposits.balance_start');
	getParam(info.deals[0].currencyId, result, ['deposits.currency', 'deposits.balance', 'deposits.currentAmount']);
	getParam(info.deals[0].rate, result, 'deposits.pct');
	getParam(info.deals[0].duration, result, 'deposits.period'); //days
	getParam(info.deals[0].paidInterest, result, 'deposits.pcts');
	getParam(info.deals[0].close, result, 'deposits.till', null, null, parseDateISO);
	getParam(info.deals[0].open, result, 'deposits.date_start', null, null, parseDateISO);
//	getParam(info.deals[0]., result, 'deposits.capitalization', /<capitalization>([\s\S]*?)<\/capitalization>/i, replaceTagsAndSpaces, parseBoolean);
	getParam(info.product.name.name, result, 'deposits.name');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Кредиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processLoans(result) {
	if (!isAvailable('credits'))
		return;
		
	var loans = callApi('rest/loan');

	AnyBalance.trace('Найдено кредитов: ' + loans.length);
	result.credits = [];

	for (var i = 0; i < loans.length; ++i) {
		var loan = loans[i];
		var _id = loan.id;
		var title = 'Кредит ' + _id;
		
		var c = {__id: _id, __name: title};

		if (__shouldProcess('credits', c)) {
			processLoan(loans[i], c);
		}

		result.credits.push(c);
	}
}

function processLoan(loan, result) {

	getParam(loan.rate, result, 'credits.pct', '', replaceTagsAndSpaces, parseBalance);
	getParam(loan.start, result, 'credits.limit', '', replaceTagsAndSpaces, parseBalance);
	getParam(loan.leftDebt, result, 'credits.balance', '', replaceTagsAndSpaces, parseBalance);
	getParam(loan.pay, result, 'credits.minpay', '', replaceTagsAndSpaces, parseBalance);
	getParam(loan.paidDebt, result, ['credits.paid', 'credits.paidLoanIntrest'], '', replaceTagsAndSpaces, parseBalance);
	getParam(loan.paid-loan.paidDebt, result, ['credits.paidLoanIntrest', 'credits.paid'], '', replaceTagsAndSpaces, parseBalance);
	getParam(loan.currencyId, result, ['credits.currency', 'credits.limit', 'credits.balance', 'credits.paid', 'credits.paidLoanIntrest', 'credits.minpay']);
	getParam(loan.next, result, 'credits.minpay_till', '', replaceTagsAndSpaces, parseDateISO);
	getParam(loan.close, result, 'credits.till', '', replaceTagsAndSpaces, parseDateISO);
	getParam(loan.open, result, 'credits.date_start', '', replaceTagsAndSpaces, parseDateISO);

	//if (typeof processLoanTransactions != 'undefined')
	//	processLoanTransactions(loan, result);
}

