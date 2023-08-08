/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Connection': 'keep-alive',
	'Content-Type': 'application/json',
	'Gpb-Accept': 'application/json, text/plain, */*',
    'Gpb-Acceptlanguage': 'ru-RU',
	'Origin': 'https://ib.online.gpb.ru',
	'Referer': 'https://ib.online.gpb.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
}

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

var g_statusCard = {
	ACTIVE: 'Активна',
	INACTIVE: 'Не активна',
	WAITING: 'Ожидается',
	BLOCKED: 'Заблокирована',
	ARRESTED: 'Арестована',
	undefined: ''
};

var g_statusAcc = {
	open: 'Активен',
	closed: 'Закрыт',
    active: 'Активен',
	inactive: 'Не активен',
	blocked: 'Заблокирован',
	arrested: 'Арестован',
	undefined: ''
};

var loginUrl = 'https://auth.online.gpb.ru/passport/gpb/authenticate?realm=/b2c/person&authIndexType=service&authIndexValue=authPhone';
var baseurlApi = 'https://omni.online.gpb.ru/omni-oks-information/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];
var g_savedData;

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	if(!g_savedData)
		g_savedData = new SavedData('gazprombank', prefs.login);

	g_savedData.restoreCookies();
	
	var authToken = g_savedData.get('authToken');
	
	if(authToken)
        g_headers = addHeaders({'Authid': authToken});

    var html = AnyBalance.requestPost(baseurlApi + 'api/v2/client/personal/info', JSON.stringify({
        "data": {},
        "meta": {
            "channel": "ib"
        }
    }), g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/needConfirm|UI\/Login/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		delete g_headers.Authid;
		clearAllCookies();
	
	    var html = AnyBalance.requestPost(loginUrl, JSON.stringify({
            "meta": {
                "channel": "ib"
            }
        }), g_headers);
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	
	    var html = AnyBalance.requestPost(loginUrl, JSON.stringify({
            "data": {
                "inputs": [
                    {
                        "name": "IDToken1",
                        "value": "7" + prefs.login
                    }
                ],
                "stage": "check_phone"
            },
            "meta": {
                "channel": "ib"
            }
        }), g_headers);
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	
	    if(json.data.stage && json.data.stage == 'phone_confirm'){
		    AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
		    
		    var formattedLogin;
		    if(json.data.outputs && json.data.outputs[9] && json.data.outputs[9].value){
			    formattedLogin = json.data.outputs[9].value;
		    }else{
		        formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, "+7 ($1) *** ** $4");
		    }
	        
	        var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + formattedLogin, null, {inputType: 'number', time: 60000});
	        
	        var html = AnyBalance.requestPost(loginUrl, JSON.stringify({
                "data": {
                    "inputs": [
                        {
                            "name": "IDToken1",
                            "value": code
                        },
                        {
                            "name": "IDToken2",
                            "value": "check"
                        }
                    ],
                    "stage": "phone_confirm"
                },
                "meta": {
                    "channel": "ib"
                }
            }), g_headers);
	
	        var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
	    }
	    
	    if(json.status != 'success'){
		    var error = (json.message.formValid || []).map(function(e) { return e.message }).join('\n');
    	    if (error) {
			    AnyBalance.trace(html);
    		    throw new AnyBalance.Error(error, null, /номер|код/i.test(error));	
    	    }

    	    AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
	
	    if(json.data.stage && json.data.stage == 'actual_password'){
		    AnyBalance.trace('Сайт затребовал пароль');
	        
	        var html = AnyBalance.requestPost(loginUrl, JSON.stringify({
                "data": {
                    "inputs": [
                        {
                            "name": "IDToken1",
                            "value": prefs.password
                        }
                    ],
                    "stage": "actual_password"
                },
                "meta": {
                    "channel": "ib"
                }
            }), g_headers);
	
	        var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
	    }
	
	    if(json.status != 'success'){
		    var error = (json.message.formValid || []).map(function(e) { return e.message }).join('\n');
    	    if (error) {
			    AnyBalance.trace(html);
    		    throw new AnyBalance.Error(error, null, /номер|код|пароль/i.test(error));	
    	    }

    	    AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
        }
		
		if(!json.data.tokenId){
    	    AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
        }
	
	    var authToken = json.data.tokenId;
	
	    g_headers = addHeaders({'Authid': authToken});
		
		g_savedData.set('authToken', authToken);
	    g_savedData.setCookies();
	    g_savedData.save();
	}
	
	var result = {success: true};
	
	AnyBalance.trace ('Получаем информацию о владельце...');
	
	var html = AnyBalance.requestPost(baseurlApi + 'api/v2/client/personal/info', JSON.stringify({
        "data": {},
        "meta": {
            "channel": "ib"
        }
    }), g_headers);
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var person = {};
	var phone = {};
	var info = json.data && json.data.client;
	if(info){
		sumParam(info.phoneCountryCode, phone, '__p', null, null, null, create_aggregate_join(''));
		sumParam(info.phoneCityCode, phone, '__p', null, null, null, create_aggregate_join(''));
	    sumParam(info.phoneNumber, phone, '__p', null, null, null, create_aggregate_join(''));
	    getParam(phone.__p, result, 'phone', null, replaceNumber);
		
		sumParam(info.firstname, person, '__n', null, null, null, create_aggregate_join(' '));
//		sumParam(info.patronymic, person, '__n', null, null, null, create_aggregate_join(' '));
	    sumParam(info.surname, person, '__n', null, null, null, create_aggregate_join(' '));
	    getParam(person.__n, result, 'fio', null, null, capitalFirstLetters);
	}
	
	switch(prefs.source){
	case 'card':
        fetchCard(prefs, result);
		break;
    case 'account':
        fetchAccount(prefs, result);
		break;
	case 'deposit':
        fetchDeposit(prefs, result);
		break;
	case 'credit':
        fetchCredit(prefs, result);
		break;
	case 'auto':
    default:
        fetchCard(prefs, result);
		break;
	}
	
	AnyBalance.setResult(result);
}
	
function fetchCard(prefs, result){
	AnyBalance.trace ('Получаем информацию по карте...');
	
	var authToken = g_savedData.get('authToken');
	g_headers = addHeaders({'Authid': authToken});
	
	var html = AnyBalance.requestPost(baseurlApi + 'api/v2/client/card/list', JSON.stringify({
        "data": {},
        "meta": {
            "channel": "ib"
        }
    }), g_headers);
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var cards = json.data.cards;
	AnyBalance.trace('Найдено карт: ' + cards.length);
	if(cards.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной карты');

	var currCard;
	for(var i=0; i<cards.length; ++i){
		var card = cards[i];
		AnyBalance.trace('Найдена карта ' + card.maskNum);
		if(!currCard && (!prefs.num || endsWith(card.maskNum, prefs.num))){
			AnyBalance.trace('Выбрана карта ' + card.maskNum);
			currCard = card;
		}
	}

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	getParam(currCard.balance.value, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(g_currency[currCard.balance.currency]||currCard.balance.currency, result, ['currency', 'balance']);
	getParam(currCard.balance.currency, result, 'currencycode');
	getParam(currCard.topup && currCard.topup.minAmount, result, 'minpay', null, null, parseBalance);
	getParam(currCard.topup && currCard.topup.endDate, result, 'minpaytill', null, null, parseDateISO);
	getParam(currCard.maskNum.replace(/(\d{4})(\d{2})(\*+)(\d{4})$/, '$1 $2** **** $4'), result, '__tariff');
	getParam(currCard.maskNum.replace(/(\d{4})(\d{2})(\*+)(\d{4})$/, '$1 $2** **** $4'), result, 'cardnum');
	getParam(currCard.name.client, result, 'type');
	getParam(currCard.state.name || (g_statusCard[currCard.state.code]||currCard.state.code), result, 'status');
	getParam(currCard.paySystem.name, result, 'paysystem');
	getParam(currCard.private.expDate, result, 'till');
	getParam(currCard.contractStartDate, result, 'opendate', null, null, parseDateISO);
}

function fetchAccount(prefs, result){
	AnyBalance.trace ('Получаем информацию по счету...');
	
	var authToken = g_savedData.get('authToken');
	g_headers = addHeaders({'Authid': authToken});
	
	var html = AnyBalance.requestPost(baseurlApi + 'api/v2/client/account/list', JSON.stringify({
        "data": {},
        "meta": {
            "channel": "ib"
        }
    }), g_headers);
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var accounts = json.data.accounts;
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного счета');

	var currAccount;
	for(var i=0; i<accounts.length; ++i){
		var account = accounts[i];
		AnyBalance.trace('Найден счет ' + account.number);
		if(!currAccount && (!prefs.num || endsWith(account.number, prefs.num))){
			AnyBalance.trace('Выбран счет ' + account.number);
			currAccount = account;
		}
	}

	if(!currAccount)
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
		
    getParam(currAccount.balance.value, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(g_currency[currAccount.balance.currency]||currAccount.balance.currency, result, ['currency', 'balance']);
	getParam(currAccount.balance.currency, result, 'currencycode');
	getParam(currAccount.number, result, '__tariff');
	getParam(currAccount.number, result, 'cardnum');
	getParam(currAccount.name.client, result, 'type');
	getParam(currAccount.state.name || (g_statusAcc[currAccount.state.code]||currAccount.state.code), result, 'status');
    getParam(currAccount.contractStartDate, result, 'opendate', null, null, parseDateISO);
    getParam(currAccount.contractNumber, result, 'contract');
}

function fetchDeposit(prefs, result){
	AnyBalance.trace ('Получаем информацию по депозиту...');
	
	var authToken = g_savedData.get('authToken');
	g_headers = addHeaders({'Authid': authToken});
	
	var html = AnyBalance.requestPost(baseurlApi + 'api/v2/client/deposit/list', JSON.stringify({
        "data": {},
        "meta": {
            "channel": "ib"
        }
    }), g_headers);
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var deposits = json.data.deposits;
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	if(deposits.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного депозита');

	var currDep;
	for(var i=0; i<deposits.length; ++i){
		var deposit = deposits[i];
		AnyBalance.trace('Найден депозит ' + deposit.detail.accNum);
		if(!currDep && (!prefs.num || endsWith(deposit.detail.accNum, prefs.num))){
			AnyBalance.trace('Выбран депозит ' + deposit.detail.accNum);
			currDep = deposit;
		}
	}

	if(!currDep)
		throw new AnyBalance.Error('Не удалось найти депозит с последними цифрами ' + prefs.num);
		
    getParam(currDep.balance.value, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(g_currency[currDep.balance.currency]||currDep.balance.currency, result, ['currency', 'balance']);
	getParam(currDep.balance.currency, result, 'currencycode');
	getParam(currDep.topup && currDep.topup.minAmount, result, 'minpay', null, null, parseBalance);
	getParam(currDep.topup && currDep.topup.endDate, result, 'minpaytill', null, null, parseDateISO);
	getParam(currDep.detail.accNum, result, '__tariff');
	getParam(currDep.detail.accNum, result, 'cardnum');
	getParam(currDep.name.client, result, 'type');
	getParam(currDep.percentRate, result, 'pct', null, null, parseBalance);
	getParam(currDep.state.name || (g_statusAcc[currDep.state.code]||currDep.state.code), result, 'status');
    getParam(currDep.contractStartDate, result, 'opendate', null, null, parseDateISO);
    getParam(currDep.contractNumber, result, 'contract');
}

function fetchCredit(prefs, result){
	AnyBalance.trace ('Получаем информацию по кредиту...');
	
	var authToken = g_savedData.get('authToken');
	g_headers = addHeaders({'Authid': authToken});
	
	var html = AnyBalance.requestPost(baseurlApi + 'api/v2/client/credit/list', JSON.stringify({
        "data": {},
        "meta": {
            "channel": "ib"
        }
    }), g_headers);
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var credits = json.data.credits;
	AnyBalance.trace('Найдено кредитов: ' + credits.length);
	if(credits.length < 1){
		throw new AnyBalance.Error('У вас нет ни одного кредита');
	}else{
		throw new AnyBalance.Error('Кредиты пока не поддерживаются. Пожалуйста, обратитесь к автору провайдера для добавления продукта');
	}

	var currCred;
	for(var i=0; i<credits.length; ++i){
		var credit = credits[i];
		AnyBalance.trace('Найден кредит ' + credit.number);
		if(!currCred && (!prefs.num || endsWith(credit.number, prefs.num))){
			AnyBalance.trace('Выбран кредит ' + credit.number);
			currCred = credit;
		}
	}

	if(!currCred)
		throw new AnyBalance.Error('Не удалось найти кредит с последними цифрами ' + prefs.num);
	
	getParam(currCred.balance.value, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(g_currency[currCred.balance.currency]||currCred.balance.currency, result, ['currency', 'balance']);
	getParam(currCred.balance.currency, result, 'currencycode');
	getParam(currCred.topup && currCred.topup.minAmount, result, 'minpay', null, null, parseBalance);
	getParam(currCred.topup && currCred.topup.endDate, result, 'minpaytill', null, null, parseDateISO);
	getParam(currCred.number, result, '__tariff');
	getParam(currCred.number, result, 'cardnum');
	getParam(currCred.name.client, result, 'type');
	getParam(currCred.percentRate, result, 'pct', null, null, parseBalance);
	getParam(currCred.state.name || (g_statusAcc[currCred.state.code]||currCred.state.code), result, 'status');
    getParam(currCred.contractStartDate, result, 'opendate', null, null, parseDateISO);
    getParam(currCred.contractNumber, result, 'contract');
}
