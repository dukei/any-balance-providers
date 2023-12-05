
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

var baseurl = 'https://xn--80afnfom.xn--80ahmohdapg.xn--80asehdb';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function getInfo(){
	var prefs = AnyBalance.getPreferences();
	
	var token = AnyBalance.getData('token' + prefs.login);
	
    var params = {
        "operationName": "clientV2",
        "variables": {},
        "query": "query clientV2 {\n  clientV2 {\n    ok\n    error\n    client {\n      ...ClientFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ClientFragment on Client {\n  id\n  identifier\n  email\n  phone\n  name\n  photo\n  token\n  hash\n  widgets {\n    code\n    size\n    __typename\n  }\n  passwordUpdateDate\n  ssoProviders {\n    name\n    type\n    attached\n    __typename\n  }\n  eulaAccepted\n  passwordInfo {\n    updateDate\n    needUpdate\n    message\n    __typename\n  }\n  __typename\n}"
    };

    html = AnyBalance.requestPost(baseurl + '/abr-lka-backend', JSON.stringify(params), addHeaders({
		'Accept': '*/*',
		'Content-Type': 'application/json',
	   	'Origin': baseurl,
        'Referer': baseurl + '/',
		'Token': token
	}));
		
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data && json.data.clientV2 && json.data.clientV2.ok && json.data.clientV2.ok != true) {
		var error = json.data.clientV2.error;
    	if (error)
    		throw new AnyBalance.Error(error);

    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
    return json.data;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var token = AnyBalance.getData('token' + prefs.login);
	
	if (token) {
		try{
	    	AnyBalance.restoreCookies();
			var json = getInfo();
	    	AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	    }catch(e){
	    	AnyBalance.trace('Сессия истекла. Будем логиниться заново...');
	    	clearAllCookies();
	    	AnyBalance.setData('token' + prefs.login, undefined);
	        AnyBalance.saveData();
			loginSite(prefs);
	    }
    } else {
    	AnyBalance.trace('Сессия новая. Будем логиниться заново...');
    	clearAllCookies();
    	loginSite(prefs);
    }

	var result = {success: true};
	
	var token = AnyBalance.getData('token' + prefs.login);
	
	AnyBalance.trace ('Пробуем получить информацию о пользователе...');
	
	var json = getInfo();

	getParam(json.clientV2.client.email, result, 'email');
	getParam(json.clientV2.client.phone, result, 'phone', null, replaceNumber);
	getParam(json.clientV2.client.name, result, 'fio');
	
	AnyBalance.trace ('Пробуем получить информацию по лицевому счету...');
	
	var params = {
        "operationName": "accountsN",
        "variables": {},
        "query": "query accountsN {\n  accountsN {\n    ok\n    error\n    accounts {\n      elsGroup {\n        els {\n          id\n          jntAccountNum\n          isFull\n          alias\n          address\n          epd {\n            id\n            name\n            typePaymentCode\n            ENABLE_PAPER_RECEIPT_EPD\n            UNITED_PAY_INDICATION_EPD\n            __typename\n          }\n          paperReceiptSetting {\n            value\n            dateTime\n            __typename\n          }\n          __typename\n        }\n        lspu {\n          id\n          account\n          isFull\n          alias\n          address\n          hasAutopay\n          elsAvailable\n          provider {\n            id\n            name\n            exchangeType {\n              code\n              __typename\n            }\n            setup {\n              ...ProviderSetupParts\n              __typename\n            }\n            __typename\n          }\n          paperReceiptSetting {\n            value\n            dateTime\n            __typename\n          }\n          __typename\n        }\n        lspuDublicate {\n          lspu\n          lspuId\n          providerId\n          providerName\n          __typename\n        }\n        __typename\n      }\n      lspu {\n        id\n        account\n        isFull\n        alias\n        address\n        hasAutopay\n        elsAvailable\n        provider {\n          id\n          name\n          exchangeType {\n            code\n            __typename\n          }\n          setup {\n            ...ProviderSetupParts\n            __typename\n          }\n          __typename\n        }\n        paperReceiptSetting {\n          value\n          dateTime\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ProviderSetupParts on ProviderSetup {\n  ACCOUNT_ATTACH_HINT\n  ALLOW_ACCESS_TYPE_CHARGE\n  ALLOW_ACCESS_TYPE_COUNTER\n  ALLOW_ACCESS_TYPE_PIN\n  ALLOW_AUTOPAY\n  ALLOW_INDICATION_CHECK_EXPIRED\n  ALLOW_INDICATION_OVERLAP\n  ALLOW_INDICATION_SEND\n  ALLOW_INDICATION_SEND_LITE\n  ALLOW_INDICATION_ZERO\n  ALLOW_PAY\n  ALLOW_PAY_APPLE\n  ALLOW_PAY_GOOGLE\n  ALLOW_PAY_SBP\n  CHARGES_INTERVAL_MONTHS_NUMBER\n  COUNTER_CHECK_DATE\n  DAYS_BEFORE_CONTRACT_END\n  DAYS_BEFORE_EQUIPMENT_CHECK\n  DUBLICATE_PAPER_RECEIPT\n  ENABLE_AGREEMENT_SECTION\n  ENABLE_APPLICATIONS_SECTION\n  ENABLE_CALCULATION_SECTION\n  ENABLE_COUNTER_RATE\n  ENABLE_INDICATION_SOURCE\n  ENABLE_NOTIFICATION_DOCUMENT\n  ENABLE_NOTIFICATION_EQUIPMENT\n  ENABLE_NOTIFICATION_INDICATION\n  ENABLE_PAPER_RECEIPT\n  ENABLE_PAYMENTS_SECTION\n  ENABLE_PAYMENT_DETAILS_FULL\n  ENABLE_PAYMENT_DETAILS_LITE\n  ENABLE_PAYMENT_EXCHANGE\n  ENABLE_PAYMENT_MESSAGE\n  ENABLE_PRINT_INVOICE\n  ENABLE_PRIVILEGES_SECTION\n  FULL_REQUEST_EMAIL\n  IS_DEFAULT_FULL\n  KKT_PAYMENT_METHOD_TYPE\n  KKT_PAYMENT_SUBJECT_TYPE\n  MAX_CONSUMPTION\n  MESSAGE_AFTER_CONTRACT_END\n  MESSAGE_AFTER_EQUIPMENT_CHECK\n  MESSAGE_BEFORE_CONTRACT_END\n  MESSAGE_BEFORE_EQUIPMENT_CHECK\n  MESSAGE_INDICATION_SECTION\n  PAYMENT_MESSAGE\n  PROVIDER_ALLOW_OFFER_ELS\n  SERVICE_UNAVAILABLE\n  SHOW_NORMS_AND_RATES\n  SHOW_PAPER_RECEIPT_OFFER\n  SUPPORT_EMAIL\n  __typename\n}"
    };

    html = AnyBalance.requestPost(baseurl + '/abr-lka-backend', JSON.stringify(params), addHeaders({
		'Accept': '*/*',
		'Content-Type': 'application/json',
	   	'Origin': baseurl,
        'Referer': baseurl + '/',
		'Token': token
	}));
		
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data && json.data.accountsN && json.data.accountsN.ok && json.data.accountsN.ok != true) {
		var error = json.data.accountsN.error;
    	if (error)
    		throw new AnyBalance.Error(error);	

    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
	AnyBalance.trace('Найдено лицевых счетов: ' + json.data.accountsN.accounts.lspu.length);

	if(json.data.accountsN.accounts.lspu.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');

	var curAcc;
	for(var i=0; i<json.data.accountsN.accounts.lspu.length; ++i){
		var acc = json.data.accountsN.accounts.lspu[i];
		AnyBalance.trace('Найден лицевой счет ' + acc.account);
		if(!curAcc && (!prefs.num || endsWith(acc.account, prefs.num))){
			AnyBalance.trace('Выбран лицевой счет ' + acc.account);
			curAcc = acc;
		}
	}

	if(!curAcc)
		throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
	
	var clientId = curAcc.id;
	getParam(curAcc.id, result, 'id');
	getParam(curAcc.account, result, 'account');
	getParam(curAcc.account, result, '__tariff');
	getParam(curAcc.address, result, 'address');
	getParam(curAcc.provider.name, result, 'provider');
	
	var params = {
        "operationName": "lspuInfo",
        "variables": {
            "lspuId": clientId
        },
        "query": "query lspuInfo($lspuId: Float!) {\n  lspuInfo(lspuId: $lspuId) {\n    ok\n    error\n    info {\n      hasInfo\n      hasCounters\n      hasAutopay\n      paymentSourceAvailable\n      insuranceAvailable\n      isFull\n      alias\n      accountId\n      account\n      balance\n      providerId\n      providerName\n      comissionTotal\n      comissionThreshold\n      actions {\n        type\n        iconUrl\n        title\n        description\n        value\n        color\n        __typename\n      }\n      alerts {\n        title\n        description\n        __typename\n      }\n      services {\n        id\n        lspu\n        lspuId\n        name\n        balance\n        providerId\n        providerName\n        providerExchangeName\n        providerExchangeCode\n        providerExchangeDescription\n        comissionType\n        comissionRate\n        comissionAmount\n        isInsurance\n        insuranceId\n        children {\n          abonentUuid\n          counterCoefficient\n          endDate\n          equipmentUuid\n          name\n          nodeUuid\n          norm\n          price\n          regimeUuid\n          serviceUuid\n          startDate\n          tariff\n          __typename\n        }\n        __typename\n      }\n      counters {\n        lspuId\n        name\n        uuid\n        serialNumber\n        numberOfRates\n        capacity\n        stateInt\n        state\n        notification\n        averageRate\n        monthsCount\n        serviceName\n        serviceLinkId\n        needVerification\n        position\n        model\n        measure\n        factorySeal\n        equipmentKind\n        meterType\n        checkDate\n        techSupportDate\n        sealDate\n        factorySealDate\n        commissionedOn\n        values {\n          valueDay\n          valueMiddle\n          valueNight\n          overlap\n          rate\n          state\n          source\n          date\n          dateDt\n          __typename\n        }\n        tariff\n        price {\n          day\n          middle\n          night\n          __typename\n        }\n        __typename\n      }\n      contracts {\n        active\n        name\n        number\n        serviceName\n        beginDate\n        endDate\n        status\n        contractKind\n        description\n        uuid\n        serviceUuid\n        notification\n        __typename\n      }\n      equipments {\n        type\n        name\n        uuid\n        serialNumber\n        state\n        needVerification\n        numberOfRates\n        municipalResource\n        meterType\n        stateInt\n        position\n        model\n        factorySeal\n        equipmentKind\n        date\n        checkDate\n        techSupportDate\n        sealDate\n        factorySealDate\n        commissionedOn\n        notification\n        color\n        __typename\n      }\n      tickets {\n        uuid\n        document\n        text\n        status\n        date\n        number\n        ticketTypeUuid\n        ticketSubtypeUuid\n        providerName\n        __typename\n      }\n      balances {\n        uuid\n        date\n        name\n        balanceStartSum\n        balanceEndSum\n        chargedSum\n        chargedVolume\n        circulationSum\n        forgivenDebt\n        organizationCode\n        paymentAdjustments\n        plannedSum\n        privilegeSum\n        privilegeVolume\n        restoredDebt\n        endBalanceApgp\n        prepaymentChargedAccumSum\n        debtSum\n        paidSum\n        children {\n          date\n          name\n          chargedSum\n          serviceUuid\n          __typename\n        }\n        __typename\n      }\n      payments {\n        uuid\n        date\n        paidSum\n        serviceName\n        serviceUuid\n        source\n        status\n        internalCode\n        transactionNumber\n        color\n        cardNumber\n        externalCode\n        approval\n        __typename\n      }\n      acts {\n        uuid\n        name\n        data\n        works {\n          sum\n          serviceUuid\n          serviceName\n          equipmentUuid\n          equipmentName\n          __typename\n        }\n        __typename\n      }\n      parameters {\n        date\n        name\n        value\n        __typename\n      }\n      privileges {\n        abonentUuid\n        active\n        beginDate\n        endDate\n        name\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"
    };

    html = AnyBalance.requestPost(baseurl + '/abr-lka-backend', JSON.stringify(params), addHeaders({
		'Accept': '*/*',
		'Content-Type': 'application/json',
	   	'Origin': baseurl,
        'Referer': baseurl + '/',
		'Token': token
	}));
		
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data && json.data.lspuInfo && json.data.lspuInfo.ok && json.data.lspuInfo.ok != true) {
		var error = json.data.lspuInfo.error;
    	if (error)
    		throw new AnyBalance.Error(error);

    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
	getParam(json.data.lspuInfo.info.balance, result, 'balance', null, null, parseBalanceMy);

    for(var i=0; json.data.lspuInfo.info.counters && i<json.data.lspuInfo.info.counters.length; ++i){
		var device = json.data.lspuInfo.info.counters[i];
		if(device){
			getParam(device.name, result, 'device');
			getParam(device.serialNumber, result, 'serialNumber');
			getParam(device.state, result, 'state');
			getParam(device.checkDate, result, 'checkDate', null, null, parseDateISO);
			if(device.values && device.values[0]){
				var curr = device.values[0].valueDay;
				var rate = device.values[0].rate;
				getParam(curr - rate, result, 'previousCounter', null, null, parseBalance);
				getParam(device.values[0].valueDay, result, 'currentCounter', null, null, parseBalance);
				getParam(device.values[0].rate, result, 'consumption', null, null, parseBalance);
				getParam(device.values[0].date, result, 'date', null, null, parseDateISO);
				getParam(device.values[0].state, result, 'countState');
				var allMonths = device.values.length;
			    var averExp = curr / allMonths;
			    getParam(parseFloat(averExp.toFixed(1)), result, 'averageMonthlyExpense', null, null, parseBalance);
			}
			break;
		}
	}
	
	for(var i=json.data.lspuInfo.info.balances.length-1; i>=0; i--){
		var data = json.data.lspuInfo.info.balances[i];

		if(data){
			var endSum = data.balanceEndSum;
			if(endSum < 0){
				getParam(data.balanceEndSum, result, 'advance', null, null, parseBalanceMy);
				getParam(0, result, 'toPay', null, null, parseBalanceMy);
			}else if(endSum > 0){
				getParam(0, result, 'advance', null, null, parseBalanceMy);
				getParam(data.balanceEndSum, result, 'toPay', null, null, parseBalanceMy);
			}else{
				getParam(0, result, 'advance', null, null, parseBalanceMy);
				getParam(0, result, 'toPay', null, null, parseBalanceMy);
			}
			getParam(data.chargedSum, result, 'charged', null, null, parseBalance);
			getParam(data.debtSum, result, 'recalculation', null, null, parseBalance);
		}
		break;
	}
	
	for(var i=0; json.data.lspuInfo.info.payments; ++i){
		var data = json.data.lspuInfo.info.payments[i];

		if(data){
			getParam(data.paidSum, result, 'paid', null, null, parseBalance);
			getParam(data.date, result, 'payDate', null, null, parseDateISO);
		}
		break;
	}

	AnyBalance.setResult(result);
}

function parseBalanceMy(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return -(balance);
}

function loginSite(prefs){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/auth', g_headers);
	
    var params = {
        "operationName": "signInN3",
        "variables": {
            "deviceInfo": {
                "appName": "desktop",
                "appVersion": "7.5.9",
                "browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                "device": "undefined",
                "system": "Windows 10",
                "screenResolution": "1600x900"
            },
            "input": {
                "identifier": prefs.login,
                "password": prefs.password,
                "agreement": false
            }
        },
        "query": "mutation signInN3($deviceInfo: DeviceInfoInputV2!, $input: ClientSignInInputV2!) {\n  signInN3(deviceInfo: $deviceInfo, input: $input) {\n    ok\n    error\n    hasAgreement\n    token\n    __typename\n  }\n}"
    };

    html = AnyBalance.requestPost(baseurl + '/abr-lka-backend', JSON.stringify(params), addHeaders({
		'Accept': '*/*',
    	'Content-Type': 'application/json',
		'Token': '',
	    'Origin': baseurl,
        'Referer': baseurl + '/',
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data && json.data.signInN3 && json.data.signInN3.hasAgreement != true) {
		AnyBalance.trace('Требуется принять соглашение. Принимаем...');
		
		params.variables.input.agreement = true;
		
		html = AnyBalance.requestPost(baseurl + '/abr-lka-backend', JSON.stringify(params), addHeaders({
	        'Accept': '*/*',
		    'Content-Type': 'application/json',
			'Token': '',
	        'Origin': baseurl,
            'Referer': baseurl + '/',
	    }));
		
		var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
    }
	
	if (json.data && json.data.signInN3 && json.data.signInN3.ok && json.data.signInN3.ok != true) {
		var error = json.data.signInN3.error;
        if (error) {
            throw new AnyBalance.Error(error, null, true);	
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
		
	var token = json.data.signInN3.token;
	AnyBalance.trace('Токен авторизации: ' + token);

    AnyBalance.setData('token' + prefs.login, token);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}	