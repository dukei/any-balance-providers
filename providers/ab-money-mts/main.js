/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
};

var g_currency = {
	RUB: '₽',
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: 'Ұ',
	CHF: '₣',
	CNY: '¥',
	undefined: ''
};

var baseurl = "https://online.mtsbank.ru";
var g_csrf;
var g_savedData;

function main(){
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('mtsbank', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/webmvc/index', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт МТС Банка временно недоступен. Попробуйте ещё раз позже');
    }
	
	if(/SESSIONID/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
    }

    var result = {success: true};
	
	switch(prefs.source){
	case 'card':
        fetchCard(prefs, result);
		break;
    case 'account':
        fetchAccount(prefs, result);
		break;
	case 'auto':
    default:
        fetchCard(prefs, result);
		break;
	}
		
	AnyBalance.setResult(result);
}

function fetchCard(prefs, result){
	
	var verb = {
		"operation":"START",
		"pfParams":{}
		};
	
	html = AnyBalance.requestPost(baseurl + '/webmvc/api/pageflow/FTONLINE/VIEWS/lastOperations', JSON.stringify(verb), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Accept-Encoding': 'gzip, deflate, br',
		'Content-Type': 'application/json;charset=UTF-8',
		'Origin': baseurl,
		'Referer': baseurl + '/webmvc/index',
		'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
	    }));
	
	var json = getJson(html);
	
	var cards = json.item.inputParams.cardList;
	AnyBalance.trace('Найдено карт: ' + cards.length);
	if(cards.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной карты');

	var currCard;
	for(var i=0; i<cards.length; ++i){
		var card = cards[i];
		AnyBalance.trace('Найдена карта ' + card.CardNumber);
		if(!currCard && (!prefs.num || endsWith(card.CardNumber, prefs.num))){
			AnyBalance.trace('Выбрана карта ' + card.CardNumber);
			currCard = card;
		}
	}

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	var cardId = currCard.ID;
	
	getParam(json.item.inputParams.PARTICIPANTNAME, result, 'fio');

    if (AnyBalance.isAvailable('balance', 'balance_all', 'res_sum', 'block_sum', 'limit', 'minpay', 'minpay_till', 'peni', 'totalpay', 'debt', 'debt_main', 'comm', 'comm_till', 'card', '__tariff', 'prod_name', 'card_status', 'card_burn', 'acc_number', 'date_start', 'date_end', 'currency', 'card_type')) {
        AnyBalance.trace('Пробуем получить данные по карте...');
		
		var verb = {
            "operation": "START",
            "pfParams": {
                "CardIDList": [
                    {
                        "CardID": cardId
                    }
                ],
                "CardID": cardId,
                "getDetailsFlag": true,
                "CardServiceRelevanceTime": "",
                "LoanDebtRelevanceTime": "15"
            }
        };
			
	    html = AnyBalance.requestPost(baseurl + '/webmvc/api/pageflow/FTOnlCard/VIEWS/PRODUCT/cardInfo', JSON.stringify(verb), addHeaders({
	   	'Accept': 'application/json, text/plain, */*',
	   	'Accept-Encoding': 'gzip, deflate, br',
	   	'Content-Type': 'application/json;charset=UTF-8',
	   	'Origin': baseurl,
	   	'Referer': baseurl + '/webmvc/index',
	   	'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
	    }));
	
		
	   	var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
		var currCard = json.item.inputParams

    	getParam(currCard.cardAvailableRest, result, 'balance', null, null, parseBalance);
		getParam(currCard.cardAvailableAmount, result, 'balance_all', null, null, parseBalance);
    	getParam(currCard.cardReservedOpAmount, result, 'res_sum', null, null, parseBalance);
		getParam(currCard.TotalBlockedAmount, result, 'block_sum', null, null, parseBalance);
		getParam(currCard.ownAmount, result, 'own_sum', null, null, parseBalance);
		getParam(currCard.loanLimit, result, 'limit', null, null, parseBalance);
		getParam(currCard.OutMinPayAmt, result, 'minpay', null, null, parseBalance);
		getParam(currCard.cardPaymentDate, result, 'minpay_till', null, null, parseDateISO);
		getParam(currCard.penaltyAmount, result, 'peni', null, null, parseBalance);
		getParam(currCard.totalPaymentAmount, result, 'totalpay', null, null, parseBalance);
		getParam(currCard.cardDebtAmount, result, 'debt', null, null, parseBalance);
		getParam(currCard.mainCardDebtAmount, result, 'debt_main', null, null, parseBalance);
		getParam(currCard.YearCommission, result, 'comm', null, null, parseBalance);
		getParam(currCard.YearCommissionDate, result, 'comm_till', null, null, parseDateISO);
    	getParam(currCard.cardNumber, result, 'card');
    	getParam(currCard.cardNumber, result, '__tariff');
    	getParam(currCard.cardName, result, 'prod_name');
    	getParam(currCard.cardStateName, result, 'card_status');
    	getParam(currCard.cardEndDate, result, 'card_burn', null, null, parseDateISO);
    	getParam(currCard.AccountNumber, result, 'acc_number');
		getParam(currCard.ContractDateStr, result, 'date_start', null, null, parseDateISO);
		getParam(currCard.DateEndStr, result, 'date_end', null, null, parseDateISO);
        getParam(g_currency[currCard.cardCurrency]||currCard.cardCurrency, result, 'currency');
		var card_type = {
    		"Virtual": 'Виртуальная',
    		"Plastic": 'Пластиковая',
			"Credit": 'Кредитная',
    		"Debet": 'Дебетовая'
    	};
    	getParam (card_type[currCard.isCardType]||currCard.isCardType, result, 'card_type');
	}
	
	if (AnyBalance.isAvailable('last_operation')) {
		AnyBalance.trace('Пробуем получить данные по операциям...');
	
	    try{
			var verb = {
                "service": "[corews]",
                "method": "startprocess",
                "params": {
                    "LIGHTPROCESS": true,
                    "STARTIMMEDIATLY": true,
                    "PROCESSNAME": "FTDBO/getLastOperations",
                    "ITEMCOUNT": 10,
                    "isCard": true,
                    "isProductForm": true,
                    "CardIDList": [
                        {
                            "CardID": cardId
                        }
                    ],
                    "StatementMode": 0
                }
		    };
			
	        html = AnyBalance.requestPost(baseurl + '/webmvc/api/dscall', JSON.stringify(verb), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Accept-Encoding': 'gzip, deflate, br',
	    	'Content-Type': 'application/json;charset=UTF-8',
	    	'Origin': baseurl,
	    	'Referer': baseurl + '/webmvc/index',
	    	'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
	        }));
	
		
	    	var json = getJson(html);
		
	    	var operData = json.dataList; // Список всех операций
	    	var lastOper = operData[0]; // Последняя операция
		
	    	AnyBalance.trace('Найдено операций: ' + operData.length);
        }catch(e){
	    	AnyBalance.trace('Не удалось получить историю операций: ' + e.message);
	    }
	
	    if (operData.length != 0) {
		
	        var lastOperSum = getParam(lastOper.AccountAmount, null, null, null, null, parseBalance);
			var lastOperCur = getParam(g_currency[lastOper.CurrencyBrief]||lastOper.CurrencyBrief);
			var lastOperDate = getParam(lastOper.Date.replace(/(\d{4})-(\d{2})-(\d{2})T([\s\S]*)(?:\.\d{3}Z)/,'$3.$2.$1 $4'));
	    	var lastOperDesc = getParam(lastOper.Description);
	    	var lastOperStat = getParam(lastOper.ApplicationStatus);
		
	    	var g_oper_dir = {
	    		0: '-',
	    		1: '+'
	    	};
	    	var oper_dir = getParam(g_oper_dir[lastOper.OperationDirection]||lastOper.OperationDirection);
		
	    	var oper = lastOperDate + '; ' + oper_dir + lastOperSum + ' ' + lastOperCur + '; ';
	    	oper += lastOperDesc + '; ' + lastOperStat;
        	getParam(oper, result, 'last_operation');
	    }else {
	    	getParam('Нет операций', result, 'last_operation');
	    }
	}
}

function fetchAccount(prefs, result){
	
    var verb = {
		"operation":"START",
		"pfParams":{}
		};
	
	html = AnyBalance.requestPost(baseurl + '/webmvc/api/pageflow/FTONLINE/VIEWS/lastOperations', JSON.stringify(verb), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Accept-Encoding': 'gzip, deflate, br',
		'Content-Type': 'application/json;charset=UTF-8',
		'Origin': baseurl,
		'Referer': baseurl + '/webmvc/index',
		'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
	    }));
	
	var json = getJson(html);
	
	var accounts = json.item.inputParams.accountList;
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного счета');

	var currAccount;
	for(var i=0; i<accounts.length; ++i){
		var account = accounts[i];
		AnyBalance.trace('Найден счет ' + account.AccountNumber);
		if(!currAccount && (!prefs.num || endsWith(account.AccountNumber, prefs.num))){
			AnyBalance.trace('Выбран счет ' + account.AccountNumber);
			currAccount = account;
		}
	}

	if(!currAccount)
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
	
	var accountId = currAccount.ID;
	
	getParam(json.item.inputParams.PARTICIPANTNAME, result, 'fio');

    if (AnyBalance.isAvailable('balance', 'card', '__tariff', 'prod_name', 'date_start', 'acc_capital', 'acc_number', 'currency')) {
        AnyBalance.trace('Пробуем получить данные по счету...');

    	getParam(currAccount.Rest, result, 'balance', null, null, parseBalance);
    	getParam(currAccount.cardName, result, 'card');
    	getParam(currAccount.AccountNumber, result, '__tariff');
    	getParam(currAccount.AccountName, result, 'prod_name');
    	getParam(currAccount.OpenDate, result, 'date_start', null, null, parseDateISO);
		getParam(currAccount.AccountCapitalizationDate, result, 'acc_capital', null, null, parseDateISO);
    	getParam(currAccount.AccountNumber, result, 'acc_number');
        getParam(g_currency[currAccount.CURRENCY]||currAccount.CURRENCY, result, 'currency');
	}
	
	if (AnyBalance.isAvailable('last_operation')) {
		AnyBalance.trace('Пробуем получить данные по операциям...');
	
	    try{
	        var verb = {
                "service": "[corews]",
                "method": "startprocess",
                "params": {
                    "PAGE": 1,
                    "ROWSCOUNT": 10,
                    "LIGHTPROCESS": true,
                    "STARTIMMEDIATLY": true,
                    "isProductForm": true,
                    "PROCESSNAME": "FTDBO/getLastOperations",
                    "ITEMCOUNT": 10,
                    "CurrentAccIDList": [
                        {
                            "AccountID": accountId
                        }
                    ]
				}
            };
			
	        html = AnyBalance.requestPost(baseurl + '/webmvc/api/dscall', JSON.stringify(verb), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Accept-Encoding': 'gzip, deflate, br',
	    	'Content-Type': 'application/json;charset=UTF-8',
	    	'Origin': baseurl,
	    	'Referer': baseurl + '/webmvc/index',
	    	'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
	        }));
	
		
	    	var json = getJson(html);
		
	    	var operData = json.dataList; // Список всех операций
	    	var lastOper = operData[0]; // Последняя операция
		
	    	AnyBalance.trace('Найдено операций: ' + operData.length);
        }catch(e){
	    	AnyBalance.trace('Не удалось получить историю операций: ' + e.message);
	    }
	
	    if (operData.length != 0) {
		
	        var lastOperSum = getParam(lastOper.AccountAmount, null, null, null, null, parseBalance);
			var lastOperCur = getParam(g_currency[lastOper.CurrencyBrief]||lastOper.CurrencyBrief);
			var lastOperDate = getParam(lastOper.Date.replace(/(\d{4})-(\d{2})-(\d{2})T([\s\S]*)(?:\.\d{3}Z)/,'$3.$2.$1 $4'));
	    	var lastOperDesc = getParam(lastOper.Description);
	    	var lastOperStat = getParam(lastOper.ApplicationStatus);
		
	    	var g_oper_dir = {
	    		0: '-',
	    		1: '+'
	    	};
	    	var oper_dir = getParam(g_oper_dir[lastOper.OperationDirection]||lastOper.OperationDirection);
		
	    	var oper = lastOperDate + '; ' + oper_dir + lastOperSum + ' ' + lastOperCur + '; ';
	    	oper += lastOperDesc + '; ' + lastOperStat;
        	getParam(oper, result, 'last_operation');
	    }else {
	    	getParam('Нет операций', result, 'last_operation');
	    }
	}
}

function loginSite(prefs){
	var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	

    AnyBalance.trace('Шаг 1. Проверка логина и пароля...');
	
	var verb = {
		"UserLogin":prefs.login,
		"ServiceName":"SMS",
		"OperationSysName":"FTOSMSSend"
		};
	
	var html = AnyBalance.requestPost(baseurl + '/mtsproxyws/audit', JSON.stringify(verb), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
		'Origin': baseurl,
		'Referer': baseurl + '/webmvc/clientLogin',
	    }));
	
	var params = [
	    ['sendCode','undefined'],
        ['LOGIN',prefs.login],
        ['PASSWORD',prefs.password],
	];
	
	var html = AnyBalance.requestPost(baseurl + '/webmvc/CLIENT/checkLoginPassword', params, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': baseurl,
		'Referer': baseurl + '/webmvc/clientLogin',
	    }));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

    if (json.ResultStatus != "true"){
		var error = json.ResultComment;
    	if (error) {
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
       	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }

    AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер телефона, привязанного к личному кабинету МТС Банка', null, {inputType: 'number', time: 170000});
	
	AnyBalance.trace('Шаг 2. Проверка авторизации...');
	
	var verb = {
		"UserLogin":prefs.login,
		"ServiceName":"LOGIN",
		"OperationSysName":"FTOClientLogin"
		};
	
	var html = AnyBalance.requestPost(baseurl + '/mtsproxyws/audit', JSON.stringify(verb), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
		'Origin': baseurl,
		'Referer': baseurl + '/webmvc/clientLogin',
	    }));
	
	var params = [
	    ['needChangePass','undefined'],
        ['PASSWORD',prefs.password],
        ['LOGIN',prefs.login],
        ['NEWPASS','undefined'],
        ['RETPASSWORD','undefined'],
        ['CODE',code],
        ['loginMode','undefined'],
        ['UserAccNumber','undefined'],
	];
	
	var html = AnyBalance.requestPost(baseurl + '/webmvc/CLIENT/checkAuthorization', params, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': baseurl,
		'Referer': baseurl + '/webmvc/clientLogin',
	    }));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (!json || json.ErrorMessage != null){
		var error = json.ErrorMessage;
    	if (error) {
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
       	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
	g_savedData.setCookies();
	g_savedData.save();
}