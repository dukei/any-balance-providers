/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	"AppVersion": "5.12.2",
    "PlatformType": "android",
    "Connection": "Keep-Alive",
    "Accept-Encoding": "gzip",
    "User-Agent": "okhttp/3.14.4"
};

var g_status = {
	block: 'Заблокирован',
	blocked: 'Заблокирован',
	inactive: 'Не активен',
	active: 'Активен',
	arrested: 'Арестован',
	closed: 'Закрыт',
	open: 'Активен',
	undefined: ''
};

var g_cardstatus = {
	block: 'Заблокирована',
	blocked: 'Заблокирована',
	inactive: 'Не активна',
	active: 'Активна',
	arrested: 'Арестована',
	closed: 'Закрыта',
	open: 'Активна',
	undefined: ''
};

var g_system = {
	mir: 'МИР',
	visa: 'VISA',
	mc: 'MasterCard',
	mastercard: 'MasterCard',
	undefined: ''
};

var g_type = {
	current: 'Текущий счет',
	saving: 'Накопительный счет',
	savingAccount: 'Накопительный счет',
	credit: 'Кредитный счет',
	creditCard: 'Кредитный счет',
	tech: 'Технический счет',
	deposit: 'Депозитный счет',
	undefined: ''
};

var baseurl = 'https://d.ubrr.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function callApi(verb, params, method){
	var prefs = AnyBalance.getPreferences();

    var headers = g_headers;

	if(params){
		headers['Content-Type'] = 'application/json; charset=UTF-8';
	}
	
	AnyBalance.trace('Запрос: ' + verb);
//	AnyBalance.trace('params: ' + JSON.stringify(params));
	var html = AnyBalance.requestPost(baseurl + verb, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method || 'GET'});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
    if((!json.result || json.result === null) || (json.errorCode && json.errorCode !== 0)){
		var error = json.errorMessage;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|номер|парол|код|не найден/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

	return json.result;
}

function loginNew(verb, params, method){
	var prefs = AnyBalance.getPreferences();
	
	var deviceId = AnyBalance.getData('deviceId');
	if(!deviceId){
        deviceId = hex_md5(prefs.login + new Date().getTime()).replace(/(\w{16})(.*)/, '$1');
		AnyBalance.setData('deviceId', deviceId);
	    AnyBalance.saveData();
	}
	
    var json = callApi('ib/api/user/register', {"deviceId": deviceId, "identificator": prefs.login, "password": prefs.password, "platform": "android"}, 'POST');
	
    if(json.registrationId && json.confirmationId){
	    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +' + json.address, null, {
			inputType: 'number',
			minLength: 4,
			maxLength: 4,
	    	time: 180000
	    });
		
		var registrationId = json.registrationId;
	    
	    var json = callApi('ib/api/user/register/confirm', {"code": code, "confirmationId": json.confirmationId, "registrationId": registrationId}, 'POST');
	}else{
		AnyBalance.trace(JSON.stringify(json));
	    throw new AnyBalance.Error('Не удалось получить параметры входа. Сайт изменен?');
    }
	
	if(!json.sessionId){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить ID сессии. Сайт изменен?');
    }
	
	var sessionId = json.sessionId;
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.setData('registrationId', registrationId);
	AnyBalance.setData('sessionId', sessionId);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}

function loginSessionCurrent(){
	var prefs = AnyBalance.getPreferences();
	var sessionId = AnyBalance.getData('sessionId');
	AnyBalance.restoreCookies();
	try{
	    AnyBalance.trace('Сессия сохранена. Пробуем войти...');
		var json = callApi('ib/api/user/profile', {"sessionId": sessionId}, 'POST');
		AnyBalance.trace('Успешно вошли в текущей сессии');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти в текущей сессии: ' + e.message);
		sessionId = AnyBalance.setData('sessionId', undefined);
	    AnyBalance.saveData();
		return false;
	}
}

function loginSessionRefresh(){
	var prefs = AnyBalance.getPreferences();
	var registrationId = AnyBalance.getData('registrationId');
	AnyBalance.restoreCookies();
	try{
		AnyBalance.trace('Сессия устарела. Пробуем возобновить...');
		var json = callApi('ib/api/user/login', {"password": prefs.password, "registrationId": registrationId}, 'POST');

        if(!json.sessionId){
        	AnyBalance.trace(JSON.stringify(json));
        	throw new AnyBalance.Error('Не удалось получить ID сессии. Сайт изменен?');
        }
		
		AnyBalance.trace('Успешно вошли в новой сессии');
		var sessionId = json.sessionId;
	
	    AnyBalance.setData('login', prefs.login);
	    AnyBalance.setData('sessionId', sessionId);
	    AnyBalance.saveCookies();
	    AnyBalance.saveData();
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти в новой сессии: ' + e.message);
		AnyBalance.setData('registrationId', undefined);
		AnyBalance.setData('sessionId', undefined);
		clearAllCookies();
		AnyBalance.saveCookies();
	    AnyBalance.saveData();
		return false;
	}
}

function loginSession(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('sessionId')){
		AnyBalance.trace('Сессия не сохранена. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('sessionId') && (AnyBalance.getData('login') !== prefs.login)){
		AnyBalance.trace('Сессия соответствует другому логину');
		return false;
	}

	if(loginSessionCurrent())
		return true;
	
	return loginSessionRefresh();
}

function login(){
	if(!loginSession()){
		loginNew();
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	login();

	var result = {success: true};
	
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
	var sessionId = AnyBalance.getData('sessionId');
	
	var json = callApi('ib/api/account/list', {"forceRefresh": false, "type": ["current", "credit", "creditCard", "tech", "deposit", "savingAccount"], "sessionId": sessionId}, 'POST');
	
	AnyBalance.trace('Найдено счетов: ' + json.accounts.length);
	if(json.accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного счета');
    
	var currAcc;
	var currCard;
	for(var i=0; i<json.accounts.length; ++i){
		var account = json.accounts[i];
		var accountId = account.id;
		AnyBalance.trace('Найден счет ' + account.number + ' (' + account.name + ')');
		if(account.cardCount && account.cardCount > 0){
			var info = callApi('ib/api/card/list', {"accountId": accountId, "sessionId": sessionId}, 'POST');
	        AnyBalance.trace('Найдено карт у счета: ' + info.cards.length);
	        for(var j=0; j<info.cards.length; ++j){
	            var card = info.cards[j];
	            AnyBalance.trace('Найдена карта ' + card.number + ' (' + card.name + ')');
	            if(!currCard && (!prefs.num || endsWith(card.number, prefs.num))){
	    	        AnyBalance.trace('Выбрана карта ' + card.number + ' (' + card.name + ')');
	    	        currAcc = account;
					currCard = card;
	            }
	        }
		}else{
			AnyBalance.trace('К счету не привязана ни одна карта. Пропускаем...');
			continue;
		}
	}

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	var accountId = currAcc.id;
	var cardId = currCard.id;
	
//	getParam(currAcc.legerAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(currAcc.availableAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
//	getParam(currAcc.availableAmount.amount, result, ['available', 'currency'], null, null, parseBalance);
//	getParam(currAcc.availableAmount.amount, result, ['blocked', 'currency'], null, null, parseBalance); // На будущее
	getParam(currAcc.legerAmount.currencySymbol, result, ['currency', 'balance', 'available', 'blocked']);
	getParam(currAcc.legerAmount.currency, result, 'currencyfull');
	getParam(currAcc.number, result, 'accnum');
	getParam(g_status[currAcc.status]||currAcc.status, result, 'status');
	getParam(g_type[currAcc.type]||currAcc.type, result, 'type');
	getParam(currCard.number, result, 'num');
  	getParam(currCard.number, result, '__tariff');
	getParam(currCard.name, result, 'name');
	getParam(currCard.cardHolder, result, 'cardholder', null, capitalFirstLetters);
	getParam(currCard.expDate.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, 'till', null, null, parseDate);
	getParam(g_system[currCard.paymentSystem]||currCard.paymentSystem, result, 'system');
	getParam(g_cardstatus[currCard.status]||currCard.status, result, 'cardstatus');

    if(AnyBalance.isAvailable('fio', 'phone')){
	    getProfileInfo(prefs, result);
	}
}

function fetchAccount(prefs, result){
	var sessionId = AnyBalance.getData('sessionId');
	
	var json = callApi('ib/api/account/list', {"forceRefresh": false, "type": ["current", "credit", "creditCard", "tech", "deposit", "savingAccount"], "sessionId": sessionId}, 'POST');
	
	AnyBalance.trace('Найдено счетов: ' + json.accounts.length);
	if(json.accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного счета');
    
	var currAcc;
    
	for(var i=0; i<json.accounts.length; ++i){
		var account = json.accounts[i];
		AnyBalance.trace('Найден счет ' + account.number + ' (' + account.name + ')');
	    if(!currAcc && (!prefs.num || endsWith(account.number, prefs.num))){
	    	AnyBalance.trace('Выбран счет ' + account.number + ' (' + account.name + ')');
	    	currAcc = account;
	    }
	}

	if(!currAcc)
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
	
	var accountId = currAcc.id;
	
//	getParam(currAcc.legerAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(currAcc.availableAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
//	getParam(currAcc.availableAmount.amount, result, ['available', 'currency'], null, null, parseBalance);
//	getParam(currAcc.availableAmount.amount, result, ['blocked', 'currency'], null, null, parseBalance); // На будущее
	getParam(currAcc.legerAmount.currencySymbol, result, ['currency', 'balance', 'available', 'blocked']);
	getParam(currAcc.legerAmount.currency, result, 'currencyfull');
	getParam(currAcc.number, result, 'accnum');
	getParam(g_type[currAcc.type]||currAcc.type, result, 'type');
  	getParam(currAcc.number, result, '__tariff');
	getParam(currAcc.name, result, 'name');
	getParam(g_status[currAcc.status]||currAcc.status, result, 'status');
    
	if(AnyBalance.isAvailable('fio', 'phone')){
	    getProfileInfo(prefs, result);
	}
}

function fetchDeposit(prefs, result){
	var sessionId = AnyBalance.getData('sessionId');
	
	var json = callApi('ib/api/deposit/classic/list', {"sessionId": sessionId}, 'POST');
	
	AnyBalance.trace('Найдено депозитов: ' + json.deposits.length);
	if(json.deposits.length < 1){
		throw new AnyBalance.Error('У вас нет ни одного депозита');
	}else{
		throw new AnyBalance.Error('Депозиты пока не поддерживаются. Пожалуйста, обратитесь к автору провайдера для добавления продукта');
	}
    
	var currDep;
    
	for(var i=0; i<json.deposits.length; ++i){
		var deposit = json.deposits[i];
		AnyBalance.trace('Найден депозит ' + deposit.number + ' (' + deposit.name + ')');
	    if(!currDep && (!prefs.num || endsWith(deposit.number, prefs.num))){
	    	AnyBalance.trace('Выбран депозит ' + deposit.number + ' (' + deposit.name + ')');
	    	currDep = deposit;
	    }
	}

	if(!currDep)
		throw new AnyBalance.Error('Не удалось найти депозит с последними цифрами ' + prefs.num);
	
	var depositId = currDep.id;
	
//	getParam(currDep.legerAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(currDep.availableAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
//	getParam(currDep.availableAmount.amount, result, ['available', 'currency'], null, null, parseBalance);
//	getParam(currDep.availableAmount.amount, result, ['blocked', 'currency'], null, null, parseBalance); // На будущее
	getParam(currDep.legerAmount.currencySymbol, result, ['currency', 'balance', 'available', 'blocked']);
	getParam(currDep.legerAmount.currency, result, 'currencyfull');
	getParam(currDep.number, result, 'accnum');
	getParam(g_type[currDep.type]||currDep.type, result, 'type');
  	getParam(currDep.number, result, '__tariff');
	getParam(currDep.name, result, 'name');
	getParam(g_status[currDep.status]||currDep.status, result, 'status');
    
	if(AnyBalance.isAvailable('fio', 'phone')){
	    getProfileInfo(prefs, result);
	}
}

function fetchCredit(prefs, result){
	var sessionId = AnyBalance.getData('sessionId');
	
	var json = callApi('ib/api/credit/list', {"sessionId": sessionId}, 'POST');
	
	AnyBalance.trace('Найдено кредитов: ' + json.credits.length);
	if(json.credits.length < 1){
		throw new AnyBalance.Error('У вас нет ни одного кредита');
	}else{
		throw new AnyBalance.Error('Кредиты пока не поддерживаются. Пожалуйста, обратитесь к автору провайдера для добавления продукта');
	}
    
	var currCred;
    
	for(var i=0; i<json.credits.length; ++i){
		var credit = json.credits[i];
		AnyBalance.trace('Найден кредит ' + credit.number + ' (' + credit.name + ')');
	    if(!currCred && (!prefs.num || endsWith(credit.number, prefs.num))){
	    	AnyBalance.trace('Выбран кредит ' + credit.number + ' (' + credit.name + ')');
	    	currCred = credit;
	    }
	}

	if(!currCred)
		throw new AnyBalance.Error('Не удалось найти кредит с последними цифрами ' + prefs.num);
	
	var creditId = currCred.id;
	
//	getParam(currCred.legerAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(currCred.availableAmount.amount, result, ['balance', 'currency'], null, null, parseBalance);
//	getParam(currCred.availableAmount.amount, result, ['available', 'currency'], null, null, parseBalance);
//	getParam(currCred.availableAmount.amount, result, ['blocked', 'currency'], null, null, parseBalance); // На будущее
	getParam(currCred.legerAmount.currencySymbol, result, ['currency', 'balance', 'available', 'blocked']);
	getParam(currCred.legerAmount.currency, result, 'currencyfull');
	getParam(currCred.number, result, 'accnum');
	getParam(g_type[currCred.type]||currCred.type, result, 'type');
  	getParam(currCred.number, result, '__tariff');
	getParam(currCred.name, result, 'name');
	getParam(g_status[currCred.status]||currCred.status, result, 'status');
    
	if(AnyBalance.isAvailable('fio', 'phone')){
	    getProfileInfo(prefs, result);
	}
}

function getProfileInfo(prefs, result){
	var sessionId = AnyBalance.getData('sessionId');
	
	var json = callApi('ib/api/user/profile', {"sessionId": sessionId}, 'POST');
	
	var fio = json.lastName;
	if(json.firstName)
		fio += ' ' + json.firstName;
	if(json.middleName)
		fio += ' ' + json.middleName;
	getParam(fio, result, 'fio', null, null, capitalFirstLetters);
	
	if(json.phone)
	    getParam(json.phone, result, 'phone', null, replaceNumber);
}
