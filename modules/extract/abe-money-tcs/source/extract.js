/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя мобильное приложение.
*/

var g_headers = {
    'User-Agent': 'OnePlus ONEPLUS A3010/android: 9/TCSMB/5.2.1'
}

var g_baseurl = 'https://api.tinkoff.ru/v1/';
var g_sessionid;
var g_postParams = {
	mobile_device_model:	'ONEPLUS A3010',
	mobile_device_os:		'android',
	appVersion:				'5.2.1',
	screen_width:			'1080',
	root_flag:				'false',
	appName:				'mobile',
	origin: 				'mobile,ib5,loyalty,platform',
	deviceId:				undefined,
    connectionType:			'WiFi',
	platform:				'android',
	screen_dpi:				'420',
	mobile_device_os_version:	'9',
	screen_height:			'1920',
	fingerprint:			'OnePlus ONEPLUS A3010/android: 9/TCSMB/5.2.1###1080x1920x32###180###false###false###',
};

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
	params.push(encodeURIComponent('appVersion') + '=' + encodeURIComponent(g_postParams.appVersion));
	params.push(encodeURIComponent('platform') + '=' + encodeURIComponent(g_postParams.platform));
	params.push(encodeURIComponent('origin') + '=' + encodeURIComponent(g_postParams.origin));
	params.push(encodeURIComponent('connectionType') + '=' + encodeURIComponent(g_postParams.connectionType));
	params.push(encodeURIComponent('deviceId') + '=' + encodeURIComponent(getDeviceId()));

	if(options.post) {
		html = AnyBalance.requestPost(g_baseurl + action + '?' + params.join('&'), options.post, g_headers);
	}else{
		html = AnyBalance.requestGet(g_baseurl + action + '?' + params.join('&'), g_headers);
	}

	var json = getJson(html);
	
	if(json.resultCode != 'OK' && !options.noException) {
		AnyBalance.trace('Ошибка: ' + action + ', ' + json.errorMessage);
		throw new AnyBalance.Error((options.scope ? options.scope + ': ' : '') + (json.plainMessage || json.errorMessage), null, /INVALID_REQUEST_DATA/i.test(json.resultCode));
	}
	
	return json;
}

var g_accountsJson, g_accountTransactions = {};
function requestAccountsJson(){
	if(!g_accountsJson)
		g_accountsJson = requestJson('accounts_flat');
	return g_accountsJson;
}

function getDataName(){
	var prefs = AnyBalance.getPreferences();
	return 'tcs_' + prefs.login;
}

function createPass(size){
	var s = '', alphabet = '0123456789abcdef';
	for(var i=0; i<size; ++i){
		s += alphabet.charAt(Math.floor(Math.random()*alphabet.length)); 
	}
	return s;
}

function getDeviceId(){
	var data = AnyBalance.getData(getDataName(), {});
	if(!data.deviceid){
		data.deviceid = createPass(16);
		AnyBalance.setData(getDataName(), data);
		AnyBalance.saveData();
	}
	return data.deviceid;
}

function loginByPhone(){
	var prefs = AnyBalance.getPreferences();
    var json = requestJson('auth/by/phone', {}, {
        post: joinObjects({
        		phone:	'+7' + prefs.login,
    			deviceId: getDeviceId(),
        	}, g_postParams),
        noException: true
    });
    
    if (json.resultCode == 'WAITING_CONFIRMATION') {
        AnyBalance.trace('Необходимо привязать устройство...');
    	if(json.confirmations.indexOf('SMSBYID') >= 0){
            var code = AnyBalance.retrieveCode("Пожалуйста, введите код подтверждения из смс", null, {
                inputType: 'number',
                time: 180000
            });
            AnyBalance.trace('Получили код: ' + code);
            
            json = requestJson('confirm', {}, {
            	post: joinObjects({
            		initialOperationTicket: json.operationTicket,
                    confirmationData: '{"SMSBYID":"' + code + '"}',
                	initialOperation: 'auth/by/phone',
    				deviceId: getDeviceId(),
            	}, g_postParams)
            });
        }else{
        	AnyBalance.trace(JSON.stringify(json));
        	throw new AnyBalance.Error('Потребовался неизвестный тип подтверждения входа');
        }
    
        if(json.payload.accessLevel === 'CANDIDATE'){
        	AnyBalance.trace('Необходим ещё и пароль');
            json = requestJson('auth/by/password', {}, {
            	post: joinObjects({
            		password: prefs.password,
    				deviceId: getDeviceId(),
            	}, g_postParams)
            });
    
            if(json.payload.accessLevel !== 'CLIENT'){
            	AnyBalance.trace(JSON.stringify(json));
            	throw new AnyBalance.Error('Не удалось войти в кабинет с нужным уровнем доступа');
            }

            var pinHash = createPass(64);
            var pin_set_date = getFormattedDate({format: 'YYYY-MM-DD HH:NN:SS'});
    
            json = requestJson('auth/pin/set', {}, {
            	post: joinObjects({
            		pinHash: pinHash,
            		auth_type_set_date: pin_set_date,
    				deviceId: getDeviceId(),
            	}, g_postParams)
            });
    
            var key = json.payload.key;
            var data = AnyBalance.getData(getDataName());
            AnyBalance.setData(getDataName(), joinObjects({
            	key: key,
            	pinHash: pinHash,
            	auth_type_set_date: pin_set_date,
            	oldSessionId: g_sessionid
            }, data));
            AnyBalance.saveData();
        }
    
    } else if (json.resultCode == 'OK') {
        g_sessionid = json.payload.sessionid;
    } else {
        throw new AnyBalance.Error(json.plainMessage || json.errorMessage, null, json.resultCode == 'AUTHENTICATION_FAILED');
    }
}

function loginByPin(){
    var data = AnyBalance.getData(getDataName());
	if(!data || !data.pinHash)
		return false;

	try{
        var json = requestJson('auth/by/pin', {}, {
            post: joinObjects({
            		pinHash:	data.pinHash,
            		auth_type: 'pin',
            		auth_type_set_date: data.auth_type_set_date,
            		oldSessionId: data.oldSessionId,
        			deviceId: getDeviceId(),
            	}, g_postParams)
        });
		
        if(json.payload.accessLevel !== 'CLIENT'){
        	AnyBalance.trace(JSON.stringify(json));
        	throw new AnyBalance.Error('Не удалось войти в кабинет с нужным уровнем доступа');
        }
        
        data.oldSessionId = g_sessionid;
        data.key = json.payload.key;
        AnyBalance.setData(getDataName(), data);
        AnyBalance.saveData();
        return true;
    }catch(e){
    	AnyBalance.trace('Не удалось зайти по пину: ' + e.message);
    	if(/Требуется привязка устройства|Неверный код доступа/i.test(e.message))
    		return false;
    	throw e;
    }
}

function login() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите ваш номер телефона!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите ваш номер телефона, 10 цифр без пробелов и разделителей, например, 9261234567 !');
	checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');

    if(!g_sessionid) {
        var json = requestJson('auth/session', {}, {
            post: joinObjects({
            		phone:	prefs.login,
            		deviceId: getDeviceId(),
            	}, g_postParams),
        });

        g_sessionid = json.payload.sessionid;
        var data = AnyBalance.getData(getDataName(), {});

        var json = requestJson('warmup_cache', {}, {
            post: joinObjects({
            		old_session_id: data.oldSessionId,
            		phone:	data.oldSessionId ? undefined : '+7' + prefs.login,
            		device_id: getDeviceId(),
            		deviceId: getDeviceId(),
            	}, g_postParams),
        });

        if(!loginByPin()){
        	loginByPhone();
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

	var balance = jspath1(card, '$.availableBalance') || jspath1(acc, '$.moneyAmount') || jspath1(acc, '$.accountBalance');

    getParam(jspath1(acc, '$.accountBalance.value'), result, 'cards.balance');
    getParam(jspath1(balance, '$.value'), result, 'cards.available');
    getParam(jspath1(balance, '$.currency.name'), result, 'cards.currency');
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

	var balance = jspath1(acc, '$.moneyAmount') || jspath1(acc, '$.accountBalance');

    getParam(jspath1(acc, '$.accountBalance.value'), result, 'accounts.balance');
    getParam(jspath1(acc, '$.moneyAmount.value'), result, 'accounts.available');
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
    getParam(jspath1(acc, '$.duedate.milliseconds'), result, 'accounts.minpay_till');
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
            num: acc.externalAccountNumber
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
    getParam(jspath1(acc, '$.tariffInfo.interestRate') || jspath1(acc, '$.rate'), result, 'savings.pct');

    getParam(jspath1(acc, '$.accountBalance.value'), result, 'savings.balance');
    getParam(jspath1(acc, '$.moneyAmount.value'), result, 'savings.available');
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