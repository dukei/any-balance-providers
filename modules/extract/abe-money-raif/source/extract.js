/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_baseurl = 'https://online.raiffeisen.ru/';

var g_currency = {
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: 'Ұ',
	CHF: '₣',
	CNY: '¥',
	undefined: ''
};

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	Accept: 'application/json, text/plain, */*',
	///'RC-Device': 'android',
	'Connection': 'keep-alive',
	'Accept-Language': 'ru',
	Referer: g_baseurl,
	Origin: g_baseurl.replace(/\/$/,''),
};

var g_token;
var g_loginInfo;

function callApi(verb, params, method){
	if(!g_token && verb != 'oauth/token')
		throw new AnyBalance.Error('Внутренняя ошибка, сайт изменен?');

	var headers;
	if(!g_token){
		headers = addHeaders({Authorization: 'Basic b2F1dGhVc2VyOm9hdXRoUGFzc3dvcmQhQA=='}); 
	}else{
		if(/oauth\/entry\/confirm/i.test(verb)){
		    headers = addHeaders({Authorization: ''});
		}else{
			headers = addHeaders({Authorization: 'Bearer ' + g_token});
		}
	}
	if(params){
		headers['Content-Type'] = 'application/json; charset=UTF-8'; 
	}
	
	AnyBalance.trace('Запрос: ' + verb);

	var html = AnyBalance.requestPost(g_baseurl + verb, params && JSON.stringify(params), headers, {HTTP_METHOD: method || 'GET'});

	if(AnyBalance.getLastStatusCode() == 401){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Отказ в доступе. Неправильный логин или пароль?', null, true);
	}
	
	if(AnyBalance.getLastStatusCode() == 460){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Отказ в доступе. Неверный код подтверждения?', null, true);
	}

	if(AnyBalance.getLastStatusCode() >= 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка вызова API ' + verb + ': ' + AnyBalance.getLastStatusCode());
	}

	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	return json;
}

function login(result) {
	var prefs = AnyBalance.getPreferences();

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	if(!g_token){
//		var node = AnyBalance.requestGet(g_baseurl + 'rest/version', g_headers);
//		AnyBalance.trace('node: ' + node);
//		var status = AnyBalance.requestGet(g_baseurl + 'oauth/status', g_headers);
//		AnyBalance.trace('status: ' + status);
		
		var dt = new Date();
		var html = AnyBalance.requestGet(g_baseurl + 'import/web/config/online.raiffeisen.ru.json?date=' + dt.getTime(), g_headers);
		var json = getJson(html);
		if(json.reCaptcha3 && json.reCaptcha3.enabled === true){
		    var reCaptcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', AnyBalance.getLastUrl(), JSON.stringify({SITEKEY: json.reCaptcha3.siteKey, TYPE: 'V3', ACTION: 'login', USERAGENT: g_headers['User-Agent']}));
        }
		var json = callApi('oauth/token', {
            "username": prefs.login,
            "password": prefs.password,
            "uiVersion": "RC3.0-GUI-5.57.1",
            "reCaptchaResponse": reCaptcha,
            "node": " ",
            "grant_type": "password"
		}, 'POST');

		g_token = json.access_token;
		AnyBalance.trace('g_token: ' + g_token);
		if(!g_token)
			throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
		
		if(json.is_push_otp_disable !== true){
			AnyBalance.trace('Сайт затребовал проверку входа с помощью кода из SMS');
			var json = callApi('oauth/entry/confirm/sms', {}, 'POST');
			var requestId = json.requestId;
			AnyBalance.trace('requestId: ' + requestId);
			if(!requestId)
				throw new AnyBalance.Error('Не удалось получить идентификатор запроса. Сайт изменен?');
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер телефона, указанный при заключении Договора банковского обслуживания', null, {inputType: 'number', time: json.await});
			var json = callApi('oauth/entry/confirm/' + requestId + '/sms', {
                "code": code
		    }, 'PUT');
		}
		
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
		getParam(json.resource_owner.mobilePhone.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4'), result.info, 'info.mphone');
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
	getParam(info.currencyId, result, ['cards.currencyFull', 'cards.currency', 'cards.balance', 'cards.minpay', 'cards.limit', 'cards.totalCreditDebtAmount', 'cards.blocked']);
	getParam(g_currency[info.currencyId]||info.currencyId, result, ['cards.currency', 'cards.currencyFull', 'cards.balance', 'cards.minpay', 'cards.limit', 'cards.totalCreditDebtAmount', 'cards.blocked']);

//	getParam(info, result, 'cards.limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
	// getParam(info, result, 'cards.totalCreditDebtAmount', /<totalCreditDebtAmount>([\s\S]*?)<\/totalCreditDebtAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info.hold, result, 'cards.blocked');
	getParam(info.type.id, result, 'cards.type_code'); //1
	getParam(info.type.name, result, 'cards.type'); //Debit card

	getParam(info.pan, result, 'cards.num');
	getParam(info.account.cba, result, 'cards.accnum');
//	getParam(info, result, 'cards.minpay_till', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info.expire, result, 'cards.till', null, replaceTagsAndSpaces, parseDateISO);
	getParam(info.status.name, result, 'cards.status'); //Open
	getParam(info.product, result, 'cards.name');
	getParam(info.cardholder, result, 'cards.holder');
//	getParam(info., result, 'cards.isCorporate', /<isCorporate>([\s\S]*?)<\/isCorporate>/i, replaceTagsAndSpaces, parseBoolean);
	getParam(info.main.id == 1, result, 'cards.isMain');
	getParam(info.open, result, 'cards.dateStart', null, null, parseDateISO);
	getParam(info.paymentSystem.name, result, 'cards.shortType');
	getParam(info.rate, result, 'cards.rate');

	function isAvailableButUnset(param){
    	if(isAvailable(param) && !isset(result[param]))
        	return true;
    	return false;
	}

	// Кредитные карты
	if (info.type.id == '2' && (isAvailable(['cards.totalCreditDebtAmount', 'cards.clearBalance', 'cards.own']) || isAvailableButUnset('cards.limit') || isAvailableButUnset('cards.minpay'))) {
		var creditCard = callApi('rest/account/' + info.accountId + '/statement/current?alien=false');
	
		var limit = getParam(creditCard.creditLimit, null, null, null, replaceTagsAndSpaces, parseBalance);
		var ownFunds = getParam(creditCard.ownFunds, null, null, null, replaceTagsAndSpaces, parseBalance);

		getParam(limit, result, 'cards.limit');
		getParam(ownFunds, result, 'cards.own');
		getParam(creditCard.minAmount, result, 'cards.minpay', null, replaceTagsAndSpaces, parseBalance);
		
		// баланс - Лимит
		getParam(info.balance - limit, result, 'cards.clearBalance');
		getParam(creditCard.totalDebt, result, 'cards.totalCreditDebtAmount', null, replaceTagsAndSpaces, parseBalance);
		getParam(creditCard.unpaidGracePeriodDue, result, 'cards.gracepay', null, replaceTagsAndSpaces, parseBalance);
		getParam(creditCard.longGraceDueDate, result, 'cards.gracepay_till', null, replaceTagsAndSpaces, parseDateISO);
		//getParam(html, result, 'cards.gracePeriodOutstanding', /<gracePeriodOutstanding>([\s\S]*?)<\/gracePeriodOutstanding>/i, replaceTagsAndSpaces, parseBalance);
	}

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
	getParam(info.currencyId, result, ['accounts.currencyFull', 'accounts.currency', 'accounts.minpay', 'accounts.limit', 'accounts.balance']);
	getParam(g_currency[info.currencyId]||info.currencyId, result, ['accounts.currency', 'accounts.currencyFull', 'accounts.minpay', 'accounts.limit', 'accounts.balance']);
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
	getParam(info.deals[0].currencyId, result, ['deposits.currencyFull', 'deposits.currency', 'deposits.balance', 'deposits.currentAmount']);
	getParam(g_currency[info.deals[0].currencyId]||info.deals[0].currencyId, result, ['deposits.currency', 'deposits.currencyFull', 'deposits.balance', 'deposits.currentAmount']);
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
	getParam(loan.currencyId, result, ['credits.currencyFull', 'credits.currency', 'credits.limit', 'credits.balance', 'credits.paid', 'credits.paidLoanIntrest', 'credits.minpay']);
	getParam(g_currency[loan.currencyId]||loan.currencyId, result, ['credits.currency', 'credits.currencyFull', 'credits.limit', 'credits.balance', 'credits.paid', 'credits.paidLoanIntrest', 'credits.minpay']);
	getParam(loan.next, result, 'credits.minpay_till', '', replaceTagsAndSpaces, parseDateISO);
	getParam(loan.close, result, 'credits.till', '', replaceTagsAndSpaces, parseDateISO);
	getParam(loan.open, result, 'credits.date_start', '', replaceTagsAndSpaces, parseDateISO);

	//if (typeof processLoanTransactions != 'undefined')
	//	processLoanTransactions(loan, result);
}


