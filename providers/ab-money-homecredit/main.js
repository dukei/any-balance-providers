/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var g_currency = {
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	undefined: '₽'
};

var baseurl = 'https://online.homecredit.ru';
var g_savedData;

function main() {
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('homecredit', prefs.login);

	g_savedData.restoreCookies();

    var pin = prefs.pin || g_savedData.get('pin');
	if(!prefs.pin)
		g_savedData.get('pin');
	
	var keyword = prefs.keyword || g_savedData.get('keyword');
	if(!prefs.keyword)
		g_savedData.get('keyword');
	
	var html = AnyBalance.requestGet(baseurl + '/web/api/Client/GetClientInfo/', g_headers);
	
	var json = getJson(html);
	
	if(!json.result && json.statusCode !== 200){
		if(!pin){
			AnyBalance.trace('Сессия новая. Будем логиниться заново...');
			login();
	    }else{
		    AnyBalance.trace('PIN-код сохранен. Пробуем войти по PIN-коду...');
		    loginPinCode();
		}
		
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
	var html = AnyBalance.requestGet(baseurl + '/web/api/proxy/mic/decard/v3/debitcards/?useCache=false', g_headers);
	
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
	
	if (AnyBalance.isAvailable('phone', 'fio')) {
	    fetchProfileInfo(prefs, result);
	}
	
	AnyBalance.setResult(result);
}

function fetchCreditCard(prefs, result){
	var html = AnyBalance.requestPost(baseurl + '/web/api/proxy/api/Product/GetClientProducts/', JSON.stringify({
        'ReturnCachedData': false
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
	    'Origin': baseurl,
        'Referer': baseurl + '/web/'
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
	var html = AnyBalance.requestGet(baseurl + '/web/api/Payment/GetDeposits/', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Счета: ' + JSON.stringify(json));
	
	var accounts = json.result.accounts;
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
	var html = AnyBalance.requestGet(baseurl + '/web/api/Payment/GetDeposits/', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Вклады: ' + JSON.stringify(json));
	
	var deposits = json.result.deposits;
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
	
	var html = AnyBalance.requestPost(baseurl + '/web/api/proxy/api/Product/GetClientProducts/', JSON.stringify({
        'ReturnCachedData': false
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
	    'Origin': baseurl,
        'Referer': baseurl + '/web/'
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

function fetchProfileInfo(prefs, result){
	var html = AnyBalance.requestGet(baseurl + '/web/api/Client/GetClientInfo/', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	
	getParam(json.result.phoneNumber.replace(/.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/i, '+7 $1 $2-$3-$4'), result, 'phone');
	var fio = json.result.firstName;
	var lastName = json.result.lastName;
	if(lastName)
		fio += ' ' + lastName;
	getParam(fio, result, 'fio');
	
	AnyBalance.setResult(result);
}

function login() {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}
	checkEmpty(prefs.birthdate, 'Введите дату рождения!');
	if (/^[\d+|\-+]*$/.test(prefs.birthdate)){
	    checkEmpty(/^(\d{4})-(\d{2})-(\d{2})$/.test(prefs.birthdate), 'Введите дату рождения в формате ГГГГ-ММ-ДД!');
	}

    var html = AnyBalance.requestGet(baseurl + '/web/Account/Login', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }

	html = AnyBalance.requestPost(baseurl + '/web/api/Account/GetCaptcha/', null, addHeaders({
		'Accept': 'application/json, text/plain, */*', 
	    'Origin': baseurl,
        'Referer': baseurl + '/web/Account/Login'
	}));
	var json = getJson(html);
		
	if(json.statusCode !== 200){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить капчу для входа. Сайт изменен?');
	}
	
	var captchaGuid = json.result.captchaGuid;
	var captchaImage = json.result.captchaImage;
	
	var captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captchaImage);
	
	AnyBalance.trace('Входим по логину ' + prefs.login);
	
	html = AnyBalance.requestPost(baseurl + '/web/api/Account/V4Login/', JSON.stringify({
        'mobilePhone': prefs.login,
        'birthDate': prefs.birthdate,
        'captchaValue': captcha,
        'captchaId': captchaGuid,
        'dfp': '5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36,Win32,1600,900,Agency FB,Arial Black,Bauhaus 93,Bell MT,Bodoni MT,Bookman Old Style,Broadway,Calibri,Californian FB,Castellar,Centaur,Century Gothic,Colonna MT,Copperplate Gothic Light,Engravers MT,Forte,Franklin Gothic Heavy,French Script MT,Gabriola,Gigi,Goudy Old Style,Haettenschweiler,Harrington,Impact,Informal Roman,Lucida Bright,Lucida Fax,Magneto,Malgun Gothic,Matura MT Script Capitals,MingLiU-ExtB,MS Reference Sans Serif,Niagara Solid,Palace Script MT,Papyrus,Perpetua,Playbill,Rockwell,Segoe Print,Showcard Gothic,Snap ITC,Vladimir Script,Wide Latin,Chrome PDF Viewer,Chromium PDF Viewer,Microsoft Edge PDF Viewer,PDF Viewer,WebKit built-in PDF,audio/mp4; codecs=\"mp4a.40.2\",audio/mpeg,audio/webm; codecs=\"vorbis\",video/mp4; codecs=\"avc1.42c00d\",video/webm; codecs=\"vorbis,vp8\",video/webm; codecs=\"vorbis,vp9\"'
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
	    'Origin': baseurl,
        'Referer': baseurl + '/web/Account/Login'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Ввели начальные данные : ' + JSON.stringify(json));
		
	if(json.statusCode !== 200){
		var error = json.errors.join(' ');
		throw new AnyBalance.Error(error, null, /телефон|дат|код/i.test(error));
	
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	AnyBalance.trace('Требуется подтверждение через SMS');
	
	html = AnyBalance.requestPost(baseurl + '/web/api/Account/V4SendSms/', null, addHeaders({
		'Accept': 'application/json, text/plain, */*', 
	    'Origin': baseurl,
        'Referer': baseurl + '/web/Account/Login'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Запросили SMS с кодом подтверждения: ' + JSON.stringify(json)); ///////////////////////////////////////////
		
	if(json.result && json.result !== true){
		var error = json.errors.join(' ');
		throw new AnyBalance.Error(error, null, /код/i.test(error));
	
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось отправить SMS с кодом подтверждения. Сайт изменен?');
	}
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +7' + prefs.login, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(baseurl + '/web/api/Account/V4ValidateSmsCode/', JSON.stringify({
        'smsCode': code
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
	    'Origin': baseurl,
        'Referer': baseurl + '/web/Account/Login'
	}));
	
	var json = getJson(html);
	AnyBalance.trace('Ввели код подтверждения из SMS: ' + JSON.stringify(json));
	
	if(json.statusCode !== 200){
		var error = json.errors.join(' ');
		if(error)
		    throw new AnyBalance.Error(error, null, /код/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
		
	if(json.result && json.result.isValidSmsCode !== true){
		throw new AnyBalance.Error('Неверный код подтверждения');
	}
	
	var isUserPinCode = json.result.isUserPinCodeCreated; // Проверка на наличие PIN-кода
	
	if(isUserPinCode !== true){ // Создаем и отправляем PIN-код
	    if(!prefs.pin){
		    var pinCode = AnyBalance.retrieveCode('Пожалуйста, создайте четырехзначный PIN-код и введите его в поле ниже', null, {inputType: 'number', time: 180000});
		}else{
			var pinCode = prefs.pin;
		}

		html = AnyBalance.requestPost(baseurl + '/web/api/Account/V4SetUserPin/', JSON.stringify({
			'clientData': null,
            'pinCode': pinCode
        }), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json;charset=UTF-8',
	        'Origin': baseurl,
            'Referer': baseurl + '/web/Account/Login'
	    }));
	
	    var json = getJson(html);
	    AnyBalance.trace('Отправили PIN-код: ' + JSON.stringify(json));
	}else{
		if(!prefs.pin){
		    var pinCode = AnyBalance.retrieveCode('Пожалуйста, введите четырехзначный PIN-код для входа в интернет-банк', null, {inputType: 'number', time: 180000});
		}else{
			var pinCode = prefs.pin;
		}

		html = AnyBalance.requestPost(baseurl + '/web/api/Account/V4CheckUserPin/', JSON.stringify({
            'pinCode': pinCode,
            'passportNumber': '',
            'clientData': null
        }), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json;charset=UTF-8',
	        'Origin': baseurl,
            'Referer': baseurl + '/web/Account/Login'
	    }));
	
	    var json = getJson(html);
	    AnyBalance.trace('Отправили PIN-код: ' + JSON.stringify(json));
	}
		
	if(json.result && json.result.isPinValid !== true){
		throw new AnyBalance.Error('Неверный PIN-код');
	}
	
	if(json.result.clientDataResult){
	    var isUserCodeWord = json.result.clientDataResult.codewordCreationSettings.isEnabled; // Проверка на наличие кодового слова
		
		if(isUserCodeWord !== true){
			AnyBalance.trace('Проверка с помощью кодового слова не требуется');
		}else{
			AnyBalance.trace('Требуется проверка с помощью кодового слова');
			
			html = AnyBalance.requestGet(baseurl + '/web/api/proxy/mic/cool-code/v2/codeword', addHeaders({
	        	'Accept': 'application/json, text/plain, */*',
	        	'Content-Type': 'application/json;charset=UTF-8',
	            'Origin': baseurl,
                'Referer': baseurl + '/web/Account/Login'
	        }));
	
	        var json = getJson(html);
	        AnyBalance.trace('Проверили на наличие кодового слова: ' + JSON.stringify(json));
			
			if(json.exist !== true){
		        throw new AnyBalance.Error('Кодовое слово не установлено. Пожалуйста, обратитесь к специалисту в любом удобном для вас офисе банка "Хоум Кредит"');
	        }else{
			    if(!prefs.keyword){
		            var keyWord = AnyBalance.retrieveCode('Пожалуйста, введите кодовое слово для входа в интернет-банк', null, {time: 180000});
		        }else{
		        	var keyWord = prefs.keyword;
		        }

		        html = AnyBalance.requestPost(baseurl + '/web/api/Account/V4LevelUp/', JSON.stringify({
                    'keyWord': keyWord
                }), addHeaders({
	            	'Accept': 'application/json, text/plain, */*',
	            	'Content-Type': 'application/json;charset=UTF-8',
	                'Origin': baseurl,
                    'Referer': baseurl + '/web/Account/Login'
	            }));
	
	            var json = getJson(html);
	            AnyBalance.trace('Отправили кодовое слово: ' + JSON.stringify(json));
		    }
		}
	}

	if(!json.result && json.statusCode !== 200){
		var error = json.errors.join(' ');
		throw new AnyBalance.Error(error, null, /телефон|дат|код|данные/i.test(error));
    
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	g_savedData.set('pin', pinCode);
	g_savedData.set('keyword', keyWord);
	g_savedData.setCookies();
	g_savedData.save();
		
	return json;
}

function loginPinCode() {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	g_savedData.restoreCookies();
	
	var pin = prefs.pin || g_savedData.get('pin');
	if(!prefs.pin)
		g_savedData.get('pin');

	var pinCode = pin;

    html = AnyBalance.requestPost(baseurl + '/web/api/Account/V4CheckUserPin/', JSON.stringify({
        'pinCode': pinCode,
        'passportNumber': '',
        'clientData': null
    }), addHeaders({
       	'Accept': 'application/json, text/plain, */*',
       	'Content-Type': 'application/json;charset=UTF-8',
        'Origin': baseurl,
        'Referer': baseurl + '/web/Account/Login'
    }));
	
    var json = getJson(html);
    AnyBalance.trace('Отправили PIN-код: ' + JSON.stringify(json));
		
	if(json.result && json.result.isPinValid !== true){
		AnyBalance.trace('Требуется повторная авторизация');
		clearAllCookies();
		login();
	}

	g_savedData.set('pin', pinCode);
	g_savedData.setCookies();
	g_savedData.save();
	
	return json;
}
