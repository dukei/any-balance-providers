/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	'Accept': 'text/xml',
	'Content-Type': 'text/xml',
	'Connection': 'keep-alive',
	'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.4.2; sdk Build/KK) Android/3.0.2(302)'
};

var baseurl = 'https://connect.raiffeisen.ru/Mobile-WS/services/';

var g_xml_login = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:login><login>%LOGIN%</login><password>%PASSWORD%</password></ser:login></soapenv:Body></soapenv:Envelope>';
var g_xml_accounts = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetAccounts /></soapenv:Body></soapenv:Envelope>';
var g_xml_cards = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetCards /></soapenv:Body></soapenv:Envelope>';
var g_xml_loans = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetLoans /></soapenv:Body></soapenv:Envelope>';
var g_xml_deposits = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetDeposits /></soapenv:Body></soapenv:Envelope>';
var g_xml_UITAccounts = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetUITAccounts /></soapenv:Body></soapenv:Envelope>';

function login(prefs, result) {
	function translateError(error) {
		var errors = {
			'logins.password.incorrect': 'Неправильный логин или пароль',
			'profile.login.first_entry': 'Это ваш первый вход в Райффайзен.Connect. Пожалуйста, зайдите в https://connect.raiffeisen.ru через браузер и установите постоянный пароль',
			'profile.login.expired': 'Уважаемый клиент, срок действия Вашего пароля истёк, так как Вы не меняли Ваше имя пользователя и/или пароль в течение последних 180 дней. Для доступа к системе требуется изменить ваше имя пользователя и/или пароль на новые значения.',
		};
		if (errors[error])
			return errors[error];

		AnyBalance.trace('Неизвестная ошибка: ' + error);
		return error;
	}

	function html_encode(str) {
		return str.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
	}

	checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
	checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestPost(baseurl + 'RCAuthorizationService', g_xml_login.replace(/%LOGIN%/g, html_encode(prefs.login)).replace(/%PASSWORD%/g, html_encode(prefs.password)), addHeaders({SOAPAction: ''}));

	if (!/loginResponse/i.test(html)) {
		var error = getParam(html, null, null, /<faultstring>([\s\S]*?)<\/faultstring>/i, replaceTagsAndSpaces);
		if (error) {
			var er = translateError(error);
			if (er)
				throw new AnyBalance.Error(er, null, /Неправильный логин или пароль|срок действия Вашего пароля истёк/i.test(er));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет банк. Обратитесь к разработчикам.');
	}

	result.profile = {};

	getParam(html, result.profile, 'profile.fio', /<name>([\s\S]*?)<\/name>/i, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(html, result.profile, 'profile.passportnumber', /<passportnumber>([\s\S]*?)<\/passportnumber>/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.passportissuer', /<passportissuer>([\s\S]*?)<\/passportissuer>/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.passportissuedate', /<passportissuedate>([\s\S]*?)<\/passportissuedate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result.profile, 'profile.login', /<login>([\s\S]*?)<\/login>/i, replaceTagsAndSpaces);

	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if (!isAvailable('cards'))
		return;

	html = AnyBalance.requestPost(baseurl + 'RCCardService', g_xml_cards, addHeaders({SOAPAction: ''}));

	var cards = getElements(html, /<return>/ig);

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];

	for (var i = 0; i < cards.length; ++i) {
		var _id = getParam(cards[i], null, null, /<id>([\s\S]*?)<\/id>/i, replaceTagsAndSpaces);
		var title = getParam(cards[i], null, null, /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces);

		var c = {__id: _id, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(info, result) {
	var balance = getParam(info, null, null, /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
	getParam(balance, result, 'cards.balance');
	getParam(info, result, ['cards.currency', 'cards.balance', 'cards.minpay', 'cards.limit', 'cards.totalCreditDebtAmount', 'cards.holdedFunds'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, toUpperCaseMy);

	getParam(info, result, 'cards.minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'cards.limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
	// getParam(info, result, 'cards.totalCreditDebtAmount', /<totalCreditDebtAmount>([\s\S]*?)<\/totalCreditDebtAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'cards.holdedFunds', /<holdedFunds>([\s\S]*?)<\/holdedFunds>/i, replaceTagsAndSpaces, parseBalance);
	var type = getParam(info, null, null, /<accountType>([\s\S]*?)<\/accountType>/i, replaceTagsAndSpaces, parseBalance);
	getParam(type, result, 'cards.type_code');

	getParam(info, result, 'cards.type', /<type>([\s\S]*?)<\/type>/i, replaceTagsAndSpaces);
	getParam(info, result, 'cards.cardnum', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces);
	getParam(info, result, 'cards.accnum', /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces);
	getParam(info, result, 'cards.minpaytill', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'cards.till', /<expirationDate>([\s\S]*?)<\/expirationDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'cards.state', /<state>([\s\S]*?)<\/state>/i, replaceTagsAndSpaces);
	getParam(info, result, 'cards.cardName', /<cardName>([\s\S]*?)<\/cardName>/i, replaceTagsAndSpaces, function (str) {
		return html_entity_decode(str) + ' (' + getParam(info, null, null, /<number>([\s\S]*?)<\/number>/i, [replaceTagsAndSpaces, /^[\s\S]*?(\d{4})$/, '$1']) + ')';
	});
	getParam(info, result, 'cards.holderName', /<holderName>([\s\S]*?)<\/holderName>/i, replaceTagsAndSpaces);
	getParam(info, result, 'cards.isCorporate', /<isCorporate>([\s\S]*?)<\/isCorporate>/i, replaceTagsAndSpaces, parseBoolean);
	getParam(info, result, 'cards.isMain', /<main>([\s\S]*?)<\/main>/i, replaceTagsAndSpaces, parseBoolean);
	getParam(info, result, 'cards.openDate', /<openDate>([\s\S]*?)<\/openDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'cards.shortType', /<shortType>([\s\S]*?)<\/shortType>/i, replaceTagsAndSpaces);

	function isAvailableButUnset(counter) {
		return isAvailable(counter) && !isset(result[counter]);
	}

	// Кредитные карты
	if (type == '3' && (isAvailable(['cards.totalCreditDebtAmount', 'cards.clearBalance', 'cards.ownFunds']) || isAvailableButUnset('cards.limit') || isAvailableButUnset('cards.minpay'))) {
		var html = AnyBalance.requestPost(baseurl + 'RCCardService', '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://entry.rconnect/xsd" xmlns:ser="http://service.rconnect" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header /><soapenv:Body><ser:getCreditStatementPeriods2><cardId>' + result.__id + '</cardId></ser:getCreditStatementPeriods2></soapenv:Body></soapenv:Envelope>', addHeaders({SOAPAction: ''}));

		var id = getParam(html, null, null, /<id>([\s\S]*?)<\/id>/i, replaceTagsAndSpaces);
		var prime = getParam(html, null, null, /<prime>([\s\S]*?)<\/prime>/i, replaceTagsAndSpaces);

		if (prime && id) {
			html = AnyBalance.requestPost(baseurl + 'RCCardService', '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://entry.rconnect/xsd" xmlns:ser="http://service.rconnect" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header /><soapenv:Body><ser:getCurrentCreditStatement><cardId>' + result.__id + '</cardId><id>' + id + '</id><isPrime>' + prime + '</isPrime></ser:getCurrentCreditStatement></soapenv:Body></soapenv:Envelope>', addHeaders({SOAPAction: ''}));

			var limit = getParam(html, null, null, /<availableCreditLimit>([\s\S]*?)<\/availableCreditLimit>/i, replaceTagsAndSpaces, parseBalance);
			var ownFunds = getParam(html, null, null, /<ownFunds>([\s\S]*?)<\/ownFunds>/i, replaceTagsAndSpaces, parseBalance);

			getParam(limit, result, 'cards.limit');
			getParam(ownFunds, result, 'cards.ownFunds');
			// баланс - Лимит
			getParam(balance - limit, result, 'cards.clearBalance');

			getParam(html, result, 'cards.totalCreditDebtAmount', /<totalDebtAmount>([\s\S]*?)<\/totalDebtAmount>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.minpay', /<minAmount>([\s\S]*?)<\/minAmount>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.gracePeriodOutstanding', /<gracePeriodOutstanding>([\s\S]*?)<\/gracePeriodOutstanding>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.unpaidGracePeriodDue', /<unpaidGracePeriodDue>([\s\S]*?)<\/unpaidGracePeriodDue>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cards.gracePeriodEnd', /<gracePeriodEnd>([\s\S]*?)<\/gracePeriodEnd>/i, replaceTagsAndSpaces, parseDateISO);

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
			 */
		} else {
			AnyBalance.trace('Не удалось найти доп информацию по карте ' + result.__name);
			AnyBalance.trace(html);
		}
	}

	if (typeof processCardTransactions != 'undefined')
		processCardTransactions(info, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
	if (!isAvailable('accounts'))
		return;

	html = AnyBalance.requestPost(baseurl + 'RCAccountService', g_xml_accounts, addHeaders({SOAPAction: ''}));

	var accounts = getElements(html, /<return>/ig);

	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];

	for (var i = 0; i < accounts.length; ++i) {
		var _id = getParam(accounts[i], null, null, /<id>([\s\S]*?)<\/id>/i, replaceTagsAndSpaces);
		var title = getParam(accounts[i], null, null, /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces);

		var c = {__id: _id, __name: title};

		if (__shouldProcess('accounts', c)) {
			processAccount(accounts[i], c);
		}

		result.accounts.push(c);
	}
}

function processAccount(info, result) {
	getParam(info, result, 'accounts.balance', /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'accounts.heldFunds', /<heldFunds>([\s\S]*?)<\/heldFunds>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, ['accounts.currency', 'accounts.minpay', 'accounts.limit', 'accounts.balance'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
	getParam(info, result, 'accounts.accnum', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces);
	getParam(info, result, 'accounts.minpaytill', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'accounts.minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'accounts.limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'accounts.till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'accounts.openDate', /<openDate>([\s\S]*?)<\/openDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'accounts.accountSubtypeName', /<accountSubtypeName>([\s\S]*?)<\/accountSubtypeName>/i, replaceTagsAndSpaces);
	getParam(info, result, 'accounts.type', /<type>([\s\S]*?)<\/type>/i, replaceTagsAndSpaces);
	getParam(info, result, 'accounts.region', /<region>([\s\S]*?)<\/region>/i, replaceTagsAndSpaces);
	getParam(info, result, 'accounts.owner_id', /<owner_id>([\s\S]*?)<\/owner_id>/i, replaceTagsAndSpaces);
	getParam(info, result, 'accounts.branchId', /<branchId>([\s\S]*?)<\/branchId>/i, replaceTagsAndSpaces);

	if (typeof processAccountTransactions != 'undefined')
		processAccountTransactions(info, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if (!isAvailable('deposits'))
		return;

	html = AnyBalance.requestPost(baseurl + 'RCDepositService', g_xml_deposits, addHeaders({SOAPAction: ''}));

	var deposits = getElements(html, /<return>/ig);

	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];

	for (var i = 0; i < deposits.length; ++i) {
		var _id = getParam(deposits[i], null, null, /<id>([\s\S]*?)<\/id>/i, replaceTagsAndSpaces);
		var title = getParam(deposits[i], null, null, /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces);

		var c = {__id: _id, __name: title};

		if (__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], c);
		}

		result.deposits.push(c);
	}
}

function processDeposit(info, result) {
	getParam(info, result, 'deposits.accnum', /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces);
	getParam(info, result, 'deposits.balance', /<initialAmount>([\s\S]*?)<\/initialAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'deposits.currentAmount', /<currentAmount>([\s\S]*?)<\/currentAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, ['deposits.currency', 'deposits.balance', 'deposits.currentAmount'], /<currency>[^<]*?([^<\.]*?)<\/currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
	getParam(info, result, 'deposits.rate', /<interestRate>([\s\S]*?)<\/interestRate>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'deposits.daysQuantity', /<daysQuantity>([\s\S]*?)<\/daysQuantity>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'deposits.pcts', /<totalInterest>([\s\S]*?)<\/totalInterest>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'deposits.till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'deposits.openDate', /<openDate>([\s\S]*?)<\/openDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'deposits.capitalization', /<capitalization>([\s\S]*?)<\/capitalization>/i, replaceTagsAndSpaces, parseBoolean);
	getParam(info, result, 'deposits.name', /<names>([\s\S]*?)<\/names>/i, replaceTagsAndSpaces);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Кредиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processLoans(html, result) {
	if (!isAvailable('loans'))
		return;

	html = AnyBalance.requestPost(baseurl + 'RCLoanService', g_xml_loans, addHeaders({SOAPAction: ''}));

	var loans = getElements(html, /<return>/ig);

	AnyBalance.trace('Найдено кредитов: ' + loans.length);
	result.loans = [];

	for (var i = 0; i < loans.length; ++i) {
		var _id = getParam(loans[i], null, null, /<id>([\s\S]*?)<\/id>/i, replaceTagsAndSpaces);
		var title = 'Кредит ' + _id;

		var c = {__id: _id, __name: title};

		if (__shouldProcess('loans', c)) {
			processLoan(loans[i], c);
		}

		result.loans.push(c);
	}
}

function processLoan(loan, result) {
	getParam(loan, result, 'loans.rate', /<intrestRate>([\s\S]*?)<\/intrestRate>/i, replaceTagsAndSpaces, parseBalance);
	getParam(loan, result, 'loans.cred_ammount', /<loanAmount>([\s\S]*?)<\/loanAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(loan, result, 'loans.balance', /<paymentRest>([\s\S]*?)<\/paymentRest>/i, replaceTagsAndSpaces, parseBalance);
	getParam(loan, result, 'loans.minpay', /<nextPaymentAmount>([\s\S]*?)<\/nextPaymentAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(loan, result, 'loans.paid', /<paidLoanAmount>([\s\S]*?)<\/paidLoanAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(loan, result, 'loans.paidLoanIntrest', /<paidLoanIntrest>([\s\S]*?)<\/paidLoanIntrest>/i, replaceTagsAndSpaces, parseBalance);
	getParam(loan, result, ['loans.currency', 'loans.cred_ammount', 'loans.balance', 'loans.paid', 'loans.paidLoanIntrest', 'loans.minpay'], /<currency>[^<]*?([^<\.]*?)<\/currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
	getParam(loan, result, 'loans.minpaytill', /<nextPaymentDate>([\s\S]*?)<\/nextPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(loan, result, 'loans.till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(loan, result, 'loans.openDate', /<openDate>([\s\S]*?)<\/openDate>/i, replaceTagsAndSpaces, parseDateISO);

	if (typeof processLoanTransactions != 'undefined')
		processLoanTransactions(loan, result);
}


// function fetchUITAccounts(baseurl, html, result){
// var prefs = AnyBalance.getPreferences();

// html = AnyBalance.requestPost(baseurl + 'RCUITService', g_xml_UITAccounts, addHeaders({SOAPAction: ''})); 

// var re = new RegExp('<return[^>]*>((?:[\\s\\S](?!</return>))*?<number>[^<]*' + (prefs.num ? prefs.num : '\\d{4}') + '</number>[\\s\\S]*?)</return>', 'i');
// var info = getParam(html, null, null, re);
// if(!info)
// throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не найдено ни одной карты');

// // подробности
// //<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetUITRequests><account><accountNumber>RC1FLP11902         </accountNumber><uitName>[Райффайзен – США, Raiffeisen - USA]</uitName><uitLink>http://www.rcmru.ru/fonds/unitinvestmenttrust/openfonds/funds/graphics/</uitLink><lastModifiedDate>2015-01-15T00:00:00</lastModifiedDate><unitPrice>32043.71</unitPrice><unitPriceSummary>276368.35</unitPriceSummary><unitQuantity>8.62473</unitQuantity></account></ser:GetUITRequests></soapenv:Body></soapenv:Envelope>

// getParam(info, result, 'type', /<type>([\s\S]*?)<\/type>/i, replaceTagsAndSpaces);
// getParam(info, result, 'cardnum', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces);
// getParam(info, result, '__tariff', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces);
// getParam(info, result, 'accnum', /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces);
// getParam(info, result, 'balance', /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
// getParam(info, result, ['currency', '__tariff'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces);
// getParam(info, result, 'minpaytill', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
// getParam(info, result, 'minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
// getParam(info, result, 'limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
// getParam(info, result, 'till', /<expirationDate>([\s\S]*?)<\/expirationDate>/i, replaceTagsAndSpaces, parseDateISO);

// if (AnyBalance.isAvailable('all')) {
// var all = sumParam(html, null, null, /<return[^>]*>([\s\S]*?)<\/return>/ig);
// var out = [];
// for (var i = 0; i < all.length; ++i) {
// var info = all[i];
// var accnum = getParam(info, null, null, /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces);
// var balance = getParam(info, null, null, /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
// var currency = getParam(info, null, null, /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces);
// out.push(accnum + ': ' + balance + ' ' + currency);
// }
// result.all = out.join('\n');
// }
// }

// Сортируем от большего к меньшему
function sortByKey(array, key) {
	return array.sort(function (a, b) {
		var x = a[key];
		var y = b[key];
		return ((x > y) ? -1 : ((x < y) ? 1 : 0));
	});
}

function getFormattedDate(yearCorr) {
	var dt = new Date();

	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth() + 1) < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1);
	var year = isset(yearCorr) ? dt.getFullYear() - yearCorr : dt.getFullYear();

	return year + '-' + month + '-' + day;
}

function parseBoolean(str) {
	return str === 'true';
}

/** Приводим все к единому виду вместо RuR пишем RUR */
function toUpperCaseMy(str) {
	return (str + '').toUpperCase();
}