/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

var g_currency = {
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	undefined: '₽'
};

var baseurl = 'https://my.homebank.ru';
var baseurlApi = 'https://api-ob.homebank.ru/';
var g_savedData;

function main() {
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	if(/^\d+$/.test(prefs.login))
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(prefs.birthdate, 'Введите дату рождения!');
	if(/^[\d+|\-+]*$/.test(prefs.birthdate))
	    checkEmpty(/^(\d{4})-(\d{2})-(\d{2})$/.test(prefs.birthdate), 'Введите дату рождения в формате ГГГГ-ММ-ДД!');
	
	if(!g_savedData)
		g_savedData = new SavedData('homecredit', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestPost(baseurlApi + 'ocelot-api-gateway/myc-auth-server/v1/clientInfo/getClientInfo', null, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Origin': baseurl,
        'Referer': baseurl + '/'
	}));
	
	if(AnyBalance.getLastStatusCode() > 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(/"StatusCode":\s*?401/i.test(html) || AnyBalance.getLastStatusCode() == 401){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		login();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}

    var result = {success: true};
	
	switch(prefs.source){
	case 'debitcard':
        fetchDebitCard(prefs, result);
		break;
	case 'creditcard':
        fetchCreditCard(prefs, result);
		break;
    case 'account':
        fetchAccount(prefs, result);
		break;
	case 'deposit':
        fetchDeposit(prefs, result);
		break;
	case 'loan':
        fetchLoan(prefs, result);
		break;
	case 'auto':
    default:
        fetchDebitCard(prefs, result);
		break;
	}
	
	AnyBalance.setResult(result);
}

function fetchDebitCard(prefs, result){
	var html = AnyBalance.requestGet(baseurlApi + 'ocelot-api-gateway/decard/v3/debitcards/?useCache=false', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Дебетовые карты: ' + JSON.stringify(json));
	
	var cards = json.debitCards;
	AnyBalance.trace('Найдено дебетовых карт: ' + cards.length);
	if(cards.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной дебетовой карты');

	var currCard;
	for(var i=0; i<cards.length; ++i){
		var card = cards[i];
		AnyBalance.trace('Найдена карта ' + card.maskCardNumber);
		if(!currCard && (!prefs.num || endsWith(card.maskCardNumber, prefs.num))){
			AnyBalance.trace('Выбрана карта ' + card.maskCardNumber);
			currCard = card;
		}
	}

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	var cardId = currCard.productId;
	
	getParam(currCard.availableBalance, result, ['balance', 'currency'], null, null, parseBalance);
    var cardNumber = currCard.maskCardNumber;
	if(cardNumber){
	    getParam(currCard.maskCardNumber.replace(/(\d{4})(\d{2})(\D{6})(\d{4})/i, '$1 $2** **** $4'), result, 'card_num');
        getParam(currCard.maskCardNumber.replace(/(\d{4})(\d{2})(\D{6})(\d{4})/i, '$1 $2** **** $4'), result, '__tariff');
	}
    getParam(currCard.productName, result, 'accname');
	getParam(currCard.accountNumber, result, 'accnum');
	getParam(currCard.contractNumber, result, 'agreement');
	getParam(currCard.contractBillingDay.replace(/(\d{4})-(\d\d)-(\d\d)/i, '$3.$2.$1'), result, 'agreement_date', null, null, parseDate);
    var card_status = {
		"ACTIVE": 'Активна',
    	"INACTIVE": 'Не активна',
		"CLOSED": 'Закрыта',
		"BLOCKED": 'Заблокирована',
		"ARRESTED": 'Арестована'
    };
	getParam(card_status[currCard.cardStatusDisplayed]||currCard.cardStatusDisplayed, result, 'status');
    getParam(currCard.expiration.replace(/(\d{4})-(\d\d)-(\d\d)/i, '$3.$2.$1'), result, 'till', null, null, parseDate);
    getParam(g_currency[currCard.currency]||currCard.currency, result, ['currency', 'balance']);
	getParam(currCard.currency, result, 'currency_code');
	var card_type = {
		"CreditCard": 'Кредитная карта',
    	"DebitCard": 'Дебетовая карта'
    };
    getParam (card_type[currCard.productType]||currCard.productType, result, 'type');
	
	if (AnyBalance.isAvailable(['last_oper_sum', 'last_oper_date', 'last_oper_type', 'last_oper_cat', 'last_oper_desc'])) {
		var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
	    var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dt.getDate());
	    var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		var params = {
            "accountNumber": currCard.accountNumber,
            "cardNumber": currCard.maskCardNumber,
            "fromDate": dateFrom,
            "toDate": dateTo,
            "startPosition": "0",
            "count": "0",
            "isSort": true
        };
		var type = 'debitCard';
	    fetchTransactions(prefs, result, params, type);
	}
	
	if (AnyBalance.isAvailable('phone', 'fio')) {
	    fetchProfileInfo(prefs, result);
	}
	
	AnyBalance.setResult(result);
}

function fetchCreditCard(prefs, result){
	var html = AnyBalance.requestPost(baseurlApi + 'ocelot-api-gateway/mycredit/api/Product/GetClientProducts', null, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Origin': baseurl,
        'Referer': baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Кредитные карты: ' + JSON.stringify(json));
	
	var cards = json.Result.CreditCard;
	AnyBalance.trace('Найдено кредитных карт: ' + cards.length);
	if(cards.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной кредитной карты');

	var currCard;
	for(var i=0; i<cards.length; ++i){
		var card = cards[i];
		AnyBalance.trace('Найдена карта ' + card.MainCardNumber);
		if(!currCard && (!prefs.num || endsWith(card.MainCardNumber, prefs.num))){
			AnyBalance.trace('Выбрана карта ' + card.MainCardNumber);
			currCard = card;
		}
	}

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	getParam(currCard.AvailableBalance, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(currCard.CreditLimit, result, 'limit', null, null, parseBalance);
	getParam(currCard.Contract.Properties.SumToPay, result, 'minpay', null, null, parseBalance);
	getParam(currCard.Contract.Properties.NextPaymentDate.replace(/(\d{4})-(\d\d)-(\d\d)/i, '$3.$2.$1'), result, 'minpay_till', null, null, parseDate);
	getParam(currCard.PenaltySum, result, 'penalty', null, null, parseBalance);
	getParam(currCard.PrincipalDebtSum, result, 'debt', null, null, parseBalance);
	getParam(currCard.OverdueDaysNum, result, 'debt_overview', null, null, parseBalance);
	getParam(currCard.TotalIndebtedness, result, 'overall_debt', null, null, parseBalance);
    var cardNumber = currCard.MainCardNumber;
	if(cardNumber){
	    getParam(currCard.MainCardNumber.replace(/(\d{4})(\d{2})(\D{6})(\d{4})/i, '$1 $2** **** $4'), result, 'card_num');
        getParam(currCard.MainCardNumber.replace(/(\d{4})(\d{2})(\D{6})(\d{4})/i, '$1 $2** **** $4'), result, '__tariff');
	}
    getParam(currCard.ProductName, result, 'accname');
	getParam(currCard.AccountNumber, result, 'accnum');
	getParam(currCard.ContractNumber, result, 'agreement');
	getParam(currCard.DateSign.replace(/(\d{4})-(\d\d)-(\d\d)/i, '$3.$2.$1'), result, 'agreement_date', null, null, parseDate);
    var card_status = {
		0: 'Закрыта',
		1: 'Не активна',
		2: 'Активна',
		3: 'Заблокирована',
		4: 'Арестована',
		"ACTIVE": 'Активна',
    	"INACTIVE": 'Не активна',
		"CLOSED": 'Закрыта',
		"BLOCKED": 'Заблокирована',
		"ARRESTED": 'Арестована'
    };
	getParam(card_status[currCard.MainCardStatus]||currCard.MainCardStatus, result, 'status');
    getParam(g_currency[currCard.currency]||currCard.currency, result, ['currency', 'balance']);
	getParam('RUR'||currCard.currency, result, 'currency_code');
	var card_type = {
		0: 'Кредитная карта',
		1: 'Кредитная карта',
		2: 'Кредитная карта',
		3: 'Кредитная карта',
		"CreditCard": 'Кредитная карта',
    	"DebitCard": 'Дебетовая карта'
    };
    getParam (card_type[currCard.ProductType]||currCard.ProductType, result, 'type');
	
	if (AnyBalance.isAvailable('phone', 'fio')) {
	    fetchProfileInfo(prefs, result);
	}
	
	AnyBalance.setResult(result);
}

function fetchAccount(prefs, result){
	var html = AnyBalance.requestGet(baseurlApi + 'ocelot-api-gateway/deposito/v1/deposits', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Счета: ' + JSON.stringify(json));
	
	var accounts = json.accounts;
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного счета');

	var currAcc;
	for(var i=0; i<accounts.length; ++i){
		var account = accounts[i];
		AnyBalance.trace('Найден счет ' + account.accountNumber);
		if(!currAcc && (!prefs.num || endsWith(account.accountNumber, prefs.num))){
			AnyBalance.trace('Выбран счет ' + account.accountNumber);
			currAcc = account;
		}
	}

	if(!currAcc)
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
	
	getParam(currAcc.runningBalance, result, ['balance', 'currency'], null, null, parseBalance);
    getParam(currAcc.accountNumber, result, '__tariff');
    getParam(currAcc.accountName, result, 'accname');
	getParam(currAcc.accountNumber, result, 'accnum');
	getParam(currAcc.contractNumber, result, 'agreement');
    var account_status = {
		"ACTIVE": 'Активен',
    	"INACTIVE": 'Не активен',
		"CLOSED": 'Закрыт',
		"BLOCKED": 'Заблокирован',
		"ARRESTED": 'Арестован'
    };
	getParam(account_status[currAcc.status]||currAcc.status, result, 'status');
    getParam(g_currency[currAcc.currency]||currAcc.currency, result, ['currency', 'balance']);
	getParam(currAcc.currency, result, 'currency_code');
	var account_type = {
		"CREDIT_CARD": 'Счет кредитной карты',
    	"DEBIT_CARD": 'Счет дебетовой карты',
		"SAVING_ACCOUNT": 'Накопительный счет'
    };
    getParam (account_type[currAcc.accountType]||currAcc.accountType, result, 'type');
	
	if (AnyBalance.isAvailable('phone', 'fio')) {
	    fetchProfileInfo(prefs, result);
	}
	
	AnyBalance.setResult(result);
}

function fetchDeposit(prefs, result){
	var html = AnyBalance.requestGet(baseurlApi + 'ocelot-api-gateway/deposito/v1/deposits', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Вклады: ' + JSON.stringify(json));
	
	var deposits = json.deposits;
	AnyBalance.trace('Найдено вкладов: ' + deposits.length);
	if(deposits.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного вклада');

	var currDepo;
	for(var i=0; i<deposits.length; ++i){
		var deposit = deposits[i];
		AnyBalance.trace('Найден вклад ' + deposit.accountNumber);
		if(!currDepo && (!prefs.num || endsWith(deposit.accountNumber, prefs.num))){
			AnyBalance.trace('Выбран вклад ' + deposit.accountNumber);
			currDepo = deposit;
		}
	}

	if(!currDepo)
		throw new AnyBalance.Error('Не удалось найти вклад с последними цифрами ' + prefs.num);
	
	getParam(currDepo.runningBalance, result, ['balance', 'currency'], null, null, parseBalance);
    getParam(currDepo.accountNumber, result, '__tariff');
    getParam(currDepo.depositName, result, 'accname');
	getParam(currDepo.accountNumber, result, 'accnum');
	getParam(currDepo.contractNumber, result, 'agreement');
	getParam(currDepo.startDate.replace(/(\d{4})-(\d\d)-(\d\d)(.*)/i, '$3.$2.$1'), result, 'agreement_date', null, null, parseDate);
	getParam(currDepo.maturityDate.replace(/(\d{4})-(\d\d)-(\d\d)(.*)/i, '$3.$2.$1'), result, 'till', null, null, parseDate);
    var deposit_status = {
		"ACTIVE": 'Активен',
    	"INACTIVE": 'Не активен',
		"CLOSED": 'Закрыт',
		"BLOCKED": 'Заблокирован',
		"ARRESTED": 'Арестован'
    };
	getParam(deposit_status[currDepo.contractStatus]||currDepo.contractStatus, result, 'status');
    getParam(g_currency[currDepo.currency]||currDepo.currency, result, ['currency', 'balance']);
	getParam(currDepo.currency, result, 'currency_code');
    getParam (currDepo.depositType, result, 'type');
	
	if (AnyBalance.isAvailable('phone', 'fio')) {
	    fetchProfileInfo(prefs, result);
	}
	
	AnyBalance.setResult(result);
}

function fetchLoan(prefs, result){
	throw new AnyBalance.Error('Кредиты пока не поддерживаются. Обратитесь к автору провайдера для добавления продукта');
	
	var html = AnyBalance.requestPost(baseurlApi + 'ocelot-api-gateway/mycredit/api/Product/GetClientProducts', null, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Origin': baseurl,
        'Referer': baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Кредиты: ' + JSON.stringify(json));
	
	var loans = json.Result.CreditLoan;
	AnyBalance.trace('Найдено кредитов: ' + loans.length);
	if(loans.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного кредита');

	var currLoan;
	for(var i=0; i<loans.length; ++i){
		var loan = loans[i];
		AnyBalance.trace('Найден кредит ' + loan.accountNumber);
		if(!currLoan && (!prefs.num || endsWith(loan.accountNumber, prefs.num))){
			AnyBalance.trace('Выбран кредит ' + loan.accountNumber);
			currLoan = loan;
		}
	}

	if(!currLoan)
		throw new AnyBalance.Error('Не удалось найти кредит с последними цифрами ' + prefs.num);
	
	getParam(currLoan.runningBalance, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(currLoan.loanLimit, result, 'limit', null, null, parseBalance);
	getParam(currLoan.OutMinPayAmt, result, 'minpay', null, null, parseBalance);
	getParam(currLoan.cardPaymentDate.replace(/(\d{4})-(\d\d)-(\d\d)(.*)/i, '$3.$2.$1'), result, 'minpay_till', null, null, parseDate);
	getParam(currLoan.penaltyAmount, result, 'penalty', null, null, parseBalance);
	getParam(currLoan.totalPaymentAmount, result, 'totalpay', null, null, parseBalance);
	getParam(currLoan.debtAmount, result, 'debt', null, null, parseBalance);
	getParam(currLoan.mainCardDebtAmount, result, 'overall_debt', null, null, parseBalance);
    getParam(currLoan.accountNumber, result, '__tariff');
    getParam(currLoan.accountName, result, 'accname');
	getParam(currLoan.accountNumber, result, 'accnum');
	getParam(currLoan.contractNumber, result, 'agreement');
	getParam(currLoan.contractBillingDay.replace(/(\d{4})-(\d\d)-(\d\d)/i, '$3.$2.$1'), result, 'agreement_date', null, null, parseDate);
    var loan_status = {
		"ACTIVE": 'Активен',
    	"INACTIVE": 'Не активен',
		"CLOSED": 'Закрыт',
		"BLOCKED": 'Заблокирован',
		"ARRESTED": 'Арестован'
    };
	getParam(loan_status[currLoan.status]||currLoan.status, result, 'status');
    getParam(g_currency[currLoan.currency]||currLoan.currency, result, ['currency', 'balance']);
	getParam(currLoan.currency, result, 'currency_code');
	var loan_type = {
		"CREDIT_CARD": 'Кредитная карта',
    	"DEBIT_CARD": 'Дебетовая карта',
		"CREDIT": 'Кредитный счет',
		"SAVING": 'Накопительный счет',
		"CURRENT": 'Текущий счет'
    };
    getParam (loan_type[currLoan.loanType]||currLoan.loanType, result, 'type');
	
	if (AnyBalance.isAvailable('phone', 'fio')) {
	    fetchProfileInfo(prefs, result);
	}
	
	AnyBalance.setResult(result);
}

function fetchTransactions(prefs, result, params, type){
	AnyBalance.trace('type: ' + type);
	AnyBalance.trace('params: ' + JSON.stringify(params));
	
	var html = AnyBalance.requestPost(baseurlApi + 'ocelot-api-gateway/clio/v1/Transactions/' + type, JSON.stringify(params), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
	    'Origin': baseurl,
        'Referer': baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Transactions: ' + JSON.stringify(json));
	
	if(json && json.length > 0){
	    AnyBalance.trace('Найдено последних операций: ' + json.length);
		for(var i=0; i<json.length; ++i){
		    var oper = json[i];
			var g_operDir = {true: '+', false: '-', undefined: ''};
		    
	        getParam(g_operDir[oper.creditDebitIndicator] + oper.amount, result, 'last_oper_sum', null, null, parseBalance);
	        getParam(oper.valueDate.replace(/(\d{4})-(\d\d)-(\d\d)(.*)/i, '$3.$2.$1'), result, 'last_oper_date', null, null, parseDate);
	        getParam(oper.primaryDescription||'Нет данных', result, 'last_oper_type');
		    getParam(oper.secondaryDescription||'Нет данных', result, 'last_oper_cat');
		    getParam(oper.shortDescription||'Нет данных', result, 'last_oper_desc');
		    
		    break;
		}
	}else{
 	    AnyBalance.trace('Не удалось получить информацию по операциям');
 	}
}

function fetchProfileInfo(prefs, result){
	var html = AnyBalance.requestPost(baseurlApi + 'ocelot-api-gateway/myc-auth-server/v1/clientInfo/getClientInfo', null, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Origin': baseurl,
        'Referer': baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	
	if(json.Result && json.Result.ClientId){
	    getParam(json.Result.PhoneNumber.replace(/.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/i, '+7 $1 $2-$3-$4'), result, 'phone');
	    
		var person = {};
	    sumParam(json.Result.FirstName, person, '__n', null, null, null, create_aggregate_join(' '));
//	    sumParam(json.Result.MiddleName, person, '__n', null, null, null, create_aggregate_join(' '));
	    sumParam(json.Result.LastName, person, '__n', null, null, null, create_aggregate_join(' '));
	    getParam(person.__n, result, 'fio', null, null, capitalFirstLetters);
	}else{
		AnyBalance.trace('Не удалось получить данные профиля. Сайт изменен?');
	}
}

function login() {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + '/auth?redirectUrl=%2F', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var params = {
        "dfp": "612cfb76924ffe925b07b5f79986a241",
        "birth": prefs.birthdate,
        "password": prefs.password,
        "phone": "7" + prefs.login,
        "osType": 4,
        "deviceName": "Microsoft Windows"
    };
	
	html = AnyBalance.requestPost(baseurlApi + 'ocelot-api-gateway/myc-auth-server/v2/sms/send/bypassword/web', JSON.stringify(params), addHeaders({
		'_os_': '4',
        '_ver_': '8.14',
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
	    'Origin': baseurl,
        'Referer': baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
		
	if(json.StatusCode !== 200){
		var error = json.Errors.join(' ');
		throw new AnyBalance.Error(error, null, /телефон|дат|код/i.test(error));
	
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
	
	var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + formattedLogin, null, {time: 180000, inputType: 'number'});
	
	var params = {
        "sms": code
    };
	
	html = AnyBalance.requestPost(baseurlApi + 'ocelot-api-gateway/myc-auth-server/v2/sms/verify/web', JSON.stringify(params), addHeaders({
		'_os_': '4',
        '_ver_': '8.14',
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
	    'Origin': baseurl,
        'Referer': baseurl + '/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.StatusCode !== 200){
		var error = json.Errors.join(' ');
		throw new AnyBalance.Error(error, null, /код/i.test(error));
	
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
		
	if(json.Result && json.Result.IsValid !== true){
		throw new AnyBalance.Error('Неверный код подтверждения');
	}
	
	var sessionId = json.Result.SessionId;
    
	g_savedData.set('sessionId', sessionId);
	g_savedData.setCookies();
	g_savedData.save();
		
	return json;
}
