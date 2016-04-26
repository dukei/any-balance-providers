/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя мобильное приложение.
*/

var g_headers = {
    'User-Agent': 'User-Agent: Sony D6503/android: 5.1.1/TCSMB/3.1.0'
}

var g_baseurl = 'https://api.tcsbank.ru/v1/';
var g_deviceid;
var g_sessionid;

function requestJson(action, data, options) {
	var params = [], html;
	if(!options) options = {};

	if(g_sessionid)
		params.push(encodeURIComponent('sessionid') + '=' + encodeURIComponent(g_sessionid));

	if(data) {
		for (var name in data) {
			params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
		}
	}

	// Заполняем параметры, которые есть всегда
	params.push(encodeURIComponent('appVersion') + '=' + encodeURIComponent('3.1.0'));
	params.push(encodeURIComponent('platform') + '=' + encodeURIComponent('android'));
	params.push(encodeURIComponent('origin') + '=' + encodeURIComponent('mobile,ib5,loyalty'));
	if(g_deviceid)
		params.push(encodeURIComponent('deviceId') + '=' + encodeURIComponent(g_deviceid));

	if(options.post) {
		html = AnyBalance.requestPost(g_baseurl + action + '?' + params.join('&'), options.post, g_headers);
	}else{
		html = AnyBalance.requestGet(g_baseurl + action + '?' + params.join('&'), g_headers);
	}

	var json = getJson(html);
	
	if(json.resultCode != 'OK' && !options.noException) {
		AnyBalance.trace('Ошибка: ' + action + ', ' + json.errorMessage);
		throw new AnyBalance.Error((options.scope ? options.scope + ': ' : '') + (json.plainMessage || json.errorMessage));
	}
	
	return json;
}

var g_accountsJson, g_accountTransactions = {};
function requestAccountsJson(){
	if(!g_accountsJson)
		g_accountsJson = requestJson('accounts_flat');
	return g_accountsJson;
}

function login() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
	checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');

    if(!g_sessionid) {
        var deviceid = hex_md5(prefs.login);

        var json = requestJson('mobile_session', {
            deviceId: deviceid
        }, {
            post: {
                username: prefs.login,
                password: prefs.password,
                screen_size: '1080x1920x32',
                timezone: -new Date().getTimezoneOffset()
            },
            noException: true
        });

        g_deviceid = deviceid;

        if (json.resultCode == 'DEVICE_LINK_NEEDED') {
            var sessionId = json.payload.sessionid;

            AnyBalance.trace('Необходимо привязать устройство...');
            var code = AnyBalance.retrieveCode("Пожалуйста, введите код подтверждения из смс", null, {
                inputType: 'number',
                time: 180000
            });
            AnyBalance.trace('Получили код: ' + code);

            json = requestJson('confirm', {
                'initialOperationTicket': json.payload.confirmationData.operationTicket,
                'confirmationData': '{"SMSBYID":"' + code + '"}',
                'initialOperation': 'mobile_link_device',
                'sessionid': sessionId,
            });

            g_sessionid = sessionId;
        } else if (json.resultCode == 'OK') {
            g_sessionid = json.payload.sessionid;
        } else {
            throw new AnyBalance.Error(json.plainMessage || json.errorMessage, null, json.resultCode == 'AUTHENTICATION_FAILED');
        }

        __setLoginSuccessful();
    }else{
        AnyBalance.trace('сессия уже установлена. Используем её.');
    }

	return g_sessionid;
}

function processCards(result){
    if(!AnyBalance.isAvailable('cards'))
        return;

	var json = requestAccountsJson();
    var accs = [];

    for (var i = 0; i < json.payload.length; i++) {
        var acc = json.payload[i];
        if(/Current|Credit/i.test(acc.accountType) && acc.cardNumbers)
            accs.push(acc);
    }
    
    AnyBalance.trace('Найдено ' + accs.length + ' счетов с картами');
    result.cards = [];

    for (var i = 0; i < accs.length; i++) {
        acc = accs[i];
        for (var j = 0; j < acc.cardNumbers.length; j++) {
            var card = acc.cardNumbers[j];

            var c = {
                __id: card.id,
                __name: card.name + ', ' + card.value,
                num: card.value,
                accid: acc.id
            };

            if(__shouldProcess('cards', c)){
                processCard(card, acc, c);
            }

            result.cards.push(c);
        }
    }
}

function processCard(card, acc, result){
	AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(jspath1(card, '$.availableBalance.value'), result, 'cards.balance');
    getParam(jspath1(card, '$.availableBalance.currency.name'), result, 'cards.currency');
    getParam(jspath1(card, '$.expiration.milliseconds'), result, 'cards.till');
    getParam(jspath1(card, '$.activated'), result, 'cards.active');
    getParam(jspath1(card, '$.primary'), result, 'cards.primary');
    getParam(jspath1(card, '$.reissued'), result, 'cards.reissued');
    getParam(jspath1(card, '$.status'), result, 'cards.status');
    getParam(jspath1(card, '$.statusCode'), result, 'cards.status_code'); //NORM
    getParam(jspath1(card, '$.name'), result, 'cards.name');

    getParam(jspath1(acc, '$.externalAccountNumber'), result, 'cards.accnum');

    if(AnyBalance.isAvailable('cards.transactions'))
        processCardsTransactions(result);
}

function processAccounts(result){
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var json = requestAccountsJson();
    var accs = [];

    for (var i = 0; i < json.payload.length; i++) {
        var acc = json.payload[i];
        if(/Current|Credit/i.test(acc.accountType))
            accs.push(acc);
    }

    AnyBalance.trace('Найдено ' + accs.length + ' счетов');
    result.accounts = [];

    for (var i = 0; i < accs.length; i++) {
        acc = accs[i];

        var c = {
            __id: acc.id,
            __name: acc.marketingName + (acc.externalAccountNumber ? ', ' + acc.externalAccountNumber : ''),
            num: acc.externalAccountNumber
        };

        if(__shouldProcess('accounts', c)){
            processAccount(acc, c);
        }

        result.accounts.push(c);
    }
}

function processAccount(acc, result){
	AnyBalance.trace('Обработка счета ' + result.__name);

	var balance = jspath1(acc, '$.accountBalance') || jspath1(acc, '$.moneyAmount');

    getParam(jspath1(balance, '$.value'), result, 'accounts.balance');
    getParam(jspath1(balance, '$.currency.name'), result, 'accounts.currency');
    getParam(jspath1(acc, '$.creationDate.milliseconds'), result, 'accounts.date_start');
    getParam(jspath1(acc, '$.accountGroup'), result, 'accounts.type');
    getParam(jspath1(acc, '$.accountType'), result, 'accounts.type_code');
    getParam(jspath1(acc, '$.authorizationsAmount.value'), result, 'accounts.blocked');

    getParam(jspath1(acc, '$.defaultMonthlyCashLimit.value'), result, 'accounts.free_cash_limit');
    getParam(jspath1(acc, '$.defaultRenewalAmountLeft.value'), result, 'accounts.free_add_limit');
    getParam(jspath1(acc, '$.monthlyCashLimit.value'), result, 'accounts.free_cash_left');
    getParam(jspath1(acc, '$.renewalAmountLeft.value'), result, 'accounts.free_add_left');

    getParam(jspath1(acc, '$.rate'), result, 'accounts.pct');
    getParam(jspath1(acc, '$.status'), result, 'accounts.status_code'); //NORM

    getParam(jspath1(acc, '$.creditLimit.value'), result, 'accounts.limit');

    getParam(jspath1(acc, '$.debtAmount.value'), result, 'accounts.debt');
    getParam(jspath1(acc, '$.currentRecommendedPayment.value'), result, 'accounts.recompay');
    getParam(jspath1(acc, '$.currentMinimalPayment.value'), result, 'accounts.minpay');
    getParam(jspath1(acc, '$.duedate.milliseconds'), result, 'accounts.minpaytill');
    getParam(jspath1(acc, '$.marketingName'), result, 'accounts.name');
    getParam(jspath1(acc, '$.loyalty[0].amount'), result, 'accounts.cashback');

    if(AnyBalance.isAvailable('accounts.transactions'))
        processAccountsTransactions(result);
}

function processDeposits(result){
    if(!AnyBalance.isAvailable('deposits'))
        return;

    var json = requestAccountsJson();
    var accs = [];

    for (var i = 0; i < json.payload.length; i++) {
        var acc = json.payload[i];
        if(/Deposit/i.test(acc.accountType))
            accs.push(acc);
    }

    AnyBalance.trace('Найдено ' + accs.length + ' депозитов');
    result.deposits = [];

    for (var i = 0; i < accs.length; i++) {
        acc = accs[i];

        var c = {
            __id: acc.id,
            __name: (acc.marketingName || acc.name) + (acc.externalAccountNumber ? ', ' + acc.externalAccountNumber : ''),
            num: acc.externalAccountNumber
        };

        if(__shouldProcess('deposits', c)){
            processDeposit(acc, c);
        }

        result.deposits.push(c);
    }
}

function processSavings(result){
    if(!AnyBalance.isAvailable('savings'))
        return;

    var json = requestAccountsJson();
    var accs = [];

    for (var i = 0; i < json.payload.length; i++) {
        var acc = json.payload[i];
        if(/Saving/i.test(acc.accountType))
            accs.push(acc);
    }

    AnyBalance.trace('Найдено ' + accs.length + ' сберегательных счетов');
    result.savings = [];

    for (var i = 0; i < accs.length; i++) {
        acc = accs[i];

        var c = {
            __id: acc.id,
            __name: (acc.marketingName || acc.name),
        };

        if(__shouldProcess('savings', c)){
            processSaving(acc, c);
        }

        result.savings.push(c);
    }
}

function processDeposit(acc, result){
	AnyBalance.trace('Обработка депозита ' + result.__name);

    getParam(jspath1(acc, '$.accountType'), result, 'deposits.type_code');
    getParam(jspath1(acc, '$.marketingName'), result, 'deposits.name');

    getParam(jspath1(acc, '$.openDate.milliseconds'), result, 'deposits.date_start');
    getParam(jspath1(acc, '$.plannedCloseDate.milliseconds'), result, 'deposits.till');

    getParam(jspath1(acc, '$.lastBonusDate.milliseconds'), result, 'deposits.date_bonus');
    getParam(jspath1(acc, '$.lastReceiptDate.milliseconds'), result, 'deposits.date_receipt');
    getParam(jspath1(acc, '$.lastRenewalDate.milliseconds'), result, 'deposits.date_renewal');

    getParam(jspath1(acc, '$.depositRate'), result, 'deposits.pct');
    getParam(jspath1(acc, '$.effectiveRate'), result, 'deposits.pct_cap');
    getParam(jspath1(acc, '$.replenishRate'), result, 'deposits.pct_topup');
    getParam(jspath1(acc, '$.interest.value'), result, 'deposits.pct_sum');
    getParam(jspath1(acc, '$.typeOfInterest'), result, 'deposits.pct_condition'); //TO_DEPOSIT

    getParam(jspath1(acc, '$.moneyAmount.value'), result, 'deposits.balance');
    getParam(jspath1(acc, '$.moneyAmount.currency.name'), result, 'deposits.currency');
    getParam(jspath1(acc, '$.startAmount'), result, 'deposits.balance_start');

    getParam(jspath1(acc, '$.period'), result, 'deposits.period'); //В месяцах

    getParam(jspath1(acc, '$.status'), result, 'deposits.status_code'); //ACTIVE

    if(AnyBalance.isAvailable('deposits.accnum')){
        var acccur = findAccountById(jspath1(acc, '$.currentLinkedAccount'));
        if(acccur)
            getParam(jspath1(acccur, '$.externalAccountNumber'), result, 'deposits.accnum');
    }

    if(AnyBalance.isAvailable('deposits.transactions'))
        processDepositsTransactions(result);


}

function processSaving(acc, result){
	AnyBalance.trace('Обработка накопительного счета ' + result.__name);

    getParam(jspath1(acc, '$.accountType'), result, 'savings.type_code');
    getParam(jspath1(acc, '$.marketingName'), result, 'savings.name');

    getParam(jspath1(acc, '$.creationDate.milliseconds'), result, 'savings.date_start');
    getParam(jspath1(acc, '$.interest.value'), result, 'savings.pct_sum');

    getParam(jspath1(acc, '$.moneyAmount.value'), result, 'savings.balance');
    getParam(jspath1(acc, '$.moneyAmount.currency.name'), result, 'savings.currency');

    getParam(jspath1(acc, '$.status'), result, 'savings.status_code'); //ACTIVE

    if(AnyBalance.isAvailable('savings.transactions'))
        processSavingsTransactions(result);


}

function findAccountById(id){
    var json = requestAccountsJson();

    for (var i = 0; i < json.payload.length; i++) {
        var acc = json.payload[i];
        if(acc.id == id)
            return acc;
    }
}

function findCardById(id){
    var json = requestAccountsJson();

    for (var i = 0; i < json.payload.length; i++) {
        var acc = json.payload[i];
        for (var j = 0; acc.cardNumbers && j < acc.cardNumbers.length; j++) {
            var card = acc.cardNumbers[j];
            if(card.id == id)
                return card;
        }
    }
}

function fetchSaving(accounts, baseurl, sessionid){
	var prefs = AnyBalance.getPreferences();
	var savingList = accounts.payload.reduce(function(res, acc){
		return res.concat(acc.accounts.filter(function(acc){
			return /Saving/i.test(acc.accountType);
		}));
	}, []);
	var saving, filtered, result;

	if(!savingList.length)
		throw new AnyBalance.Error("У вас нет ни одного накопительного счета!");

	// Берем 1й так как нету externalAccountNumber
	saving = savingList[0];

	result = {success: true};
	getParam(saving.moneyAmount.value, result, 'balance');
	getParam(saving.moneyAmount.currency.name, result, ['currency', 'balance']);
	getParam(saving.nextStatementDate.milliseconds, result, 'nextStatementDate');
	getParam(saving.name, result, 'name');
	getParam(saving.name, result, '__tariff');

    AnyBalance.setResult(result);
}