/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

// Фикс для All Balance - убрать с выходом новой версии
// Шаги алгоритма ECMA-262, 5-е издание, 15.4.4.21
// Ссылка (en): http://es5.github.io/#x15.4.4.21
// Ссылка (ru): http://es5.javascript.ru/x15.4.html#x15.4.4.21
if (!Array.prototype.reduce) {
	Array.prototype.reduce = function(callback /*, initialValue*/ ) {
		'use strict';
		if (this == null) {
			throw new TypeError('Array.prototype.reduce called on null or undefined');
		}
		if (typeof callback !== 'function') {
			throw new TypeError(callback + ' is not a function');
		}
		var t = Object(this),
			len = t.length >>> 0,
			k = 0,
			value;
		if (arguments.length == 2) {
			value = arguments[1];
		} else {
			while (k < len && !k in t) {
				k++;
			}
			if (k >= len) {
				throw new TypeError('Reduce of empty array with no initial value');
			}
			value = t[k++];
		}
		for (; k < len; k++) {
			if (k in t) {
				value = callback(value, t[k], k, t);
			}
		}
		return value;
	};
}

var g_countersTable = {
	common: {
		'spasibo': 'spasibo',
	}, 
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardnum": "cards.cardnum",
		"__tariff": "cards.cardnum",
		"name": "cards.type",
		"status": "cards.status",
		"till": "cards.till",
		"accnum": "cards.acc_num",
		'needpay': 'cards.needpay',
		'gracepay': 'cards.gracepay',
		'gracepaytill': 'cards.gracepaytill',
		'pct': 'cards.pct',
		'credit': 'cards.credit',
		'limit': 'cards.limit',
	},
	crd: {
    	"balance": "loans.balance",
		"currency": "loans.currency",
		"latedebt": "loans.penalty",
		"needpaytill": "loans.minpaydate",
		"needpay": "loans.minpay",
		"accnum": "loans.acc_num",
		"pctcredit": "loans.pct",
		"__tariff": "loans.acc_num",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"name": "cards.type",
		"cardnum": "accounts.cardnum",
		
		
		
		"rate": "accounts.rate",
		"__tariff": "accounts.cardNumber",
		"till": "accounts.till",
    },
	dep: {
    	"balance": "deposits.balance",
    	"currency": "deposits.currency",
		"pctcredit": "deposits.pct",
		"accnum": "deposits.acc_num",
    }
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	if(!info || (!info.__id || !info.__name))
		return false;
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__id, prefs.num))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__id, prefs.num))
				return true;
		}
		case 'loans':
		{
			if(prefs.type != 'crd')
				return false;
		    if(!prefs.num)
		    	return true;
			
			var accNum = info.__id.replace(/\D/g, '');
			return new RegExp(prefs.num, 'i').test(accNum);
			
			if(endsWith(info.__id.replace(/\D/g, ''), prefs.num))
				return true;
		}	
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__id, prefs.num))
				return true;
		}
		default:
			return false;
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
    if(!/^(card|crd|dep|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processLoans = adapter.envelope(processLoans);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login(prefs);
	
	var result = {success: true};
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'crd') {
		adapter.processLoans(html, result);

		if(!adapter.wasProcessed('loans'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	// getParam(html, result, 'bonuses', /МКБ Бонус\s*<span[^>]*>([\s\d]+)&nbsp;баллов/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function fetchCredit(baseurl, result, prefs) {
	var html = AnyBalance.requestGet(baseurl + 'secure/loans.aspx', g_headers);

	var loans = getParam(html, null, null, /var loanDetailsData =\s*([^]*?)\s*var/i, null, getJson);

	if(!loans || !isArray(loans) || !loans.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одного счета.');
	}

	var loan;
	for(var i = 0, toi = loans.length; i < toi; i++){
		// Нужен аккаунт, где есть счет с цифрами
		if((prefs.num && new RegExp('.*' + prefs.num + '.*').test(loans[i].cn)) || !prefs.num){
			loan = loans[i];
			break;
		}
	}

	if(!loan){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Обратитесь к разработчикам, поиск счета по последним цифрам не поддерживается.');
	}

	getParam(loan.dt, result, 'balance', /Текущая сумма долга по кредиту[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(loan.dt, result, ['currency' , 'balance'], /Текущая сумма долга по кредиту[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(loan.cn, result, 'cardnum');
    getParam(loan.dt, result, 'name', /Тип кредита[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(loan.dt, result, 'pctcredit', /Текущая процентная ставка по кредиту[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(loan.dt, result, 'gracepay', /Сумма ближайшего платежа[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(loan.dt, result, 'gracepaytill', /Дата ближайшего платежа[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
}

function fetchAccount(baseurl, result, prefs) {
    var html = AnyBalance.requestGet(baseurl + 'secure/accounts.aspx', g_headers);

	var accounts = getParam(html, null, null, /var accountdata = (\[[^\]]+\])/i, null, getJson);

	if(!accounts || !isArray(accounts) || !accounts.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одного счета.');
	}

	var account;
	for(var i = 0, toi = accounts.length; i < toi; i++){
		// Нужен аккаунт, где есть счет с цифрами
		if((prefs.num && new RegExp('\\*\\*\\*' + prefs.num).test(accounts[i].acc)) || !prefs.num){
			account = accounts[i];
			break;
		}
	}

	if(!account){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Обратитесь к разработчикам, поиск счета по последним цифрам не поддерживается.');
	}

	getParam(account.acc, result, 'cardnum');
    getParam(account.acctype, result, 'type');
    getParam(account.acctype, result, '__tariff');
    getParam(account.balance, result, 'balance', null, null, parseBalance);
    getParam(account.balance, result, ['currency' , '__tariff'], null, null, parseCurrency);
}

function fetchDeposit(baseurl, result, prefs) {
	var html = AnyBalance.requestGet(baseurl + 'secure/deps.aspx');
	
	var deposits = getParam(html, null, null, /var depdata = (\[[^\]]+\])/i, null, getJson);

	if(!deposits || !isArray(deposits) || !deposits.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одного вклада.');
	}

	var deposit;
	for(var i = 0, toi = deposits.length; i < toi; i++){
		if((prefs.num && new RegExp('\\d+' + prefs.num).test(deposits[i].ac)) || !prefs.num){
			deposit = deposits[i];
			break;
		}
	}

	if(!deposit){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти депозит с последними цифрами номера счета ' + prefs.num);
	}

	getParam(deposit.ac, result, 'accnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(deposit.nm, result, 'cardnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(deposit.db, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(deposit.dr, result, 'pctcredit', null, replaceTagsAndSpaces, parseBalance);
	getParam(deposit.de, result, 'deptill', null, replaceTagsAndSpaces, parseDateWord);
}