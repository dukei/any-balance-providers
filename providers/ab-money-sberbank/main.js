/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'spasibo': 'spasibo',
		'userName': 'userName',
		'eurPurch': 'eurPurch',
		'eurSell': 'eurSell',
		'usdPurch': 'usdPurch',
		'usdSell': 'usdSell',
	}, 
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardNumber": "cards.cardNumber",
		"till": "cards.till",
		"status": "cards.status",
		"cardName": "cards.cardName",
		"minpaydate": "cards.minpaydate",
		"minpay": "cards.minpay",
		"maxlimit": "cards.maxlimit",
		"debt": "cards.debt",
		"debt_date": "cards.debt_date",
		"cash": "cards.cash",
		"own": "cards.own",
		"electrocash": "cards.electrocash",
		"userName": "cards.userName",
		"__tariff": "cards.cardNumber",
		
		"lastPurchSum": "cards.transactions10.sum",
		"lastPurchPlace": "cards.transactions10.name",
		"lastPurchDate": "cards.transactions10.time"
		
	},
	loan: {
    	"balance": "loans.balance",
		"currency": "loans.currency",
		"till": "loans.till",
		
		"minpaydate": "loans.minpaydate",
		"minpay": "loans.minpay",
		"maxlimit": "loans.maxlimit",
		"loan_ammount": "loans.loan_ammount",
		"userName": "loans.userName",
		"cardNumber": "loans.num",
		"__tariff": "loans.num",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"rate": "accounts.rate",
		"cardNumber": "accounts.num",
		"__tariff": "accounts.num",
		"till": "accounts.till",
    },
	metal_acc: {
    	"balance": "accounts_met.balance",
    	"currency": "accounts_met.currency",
		"cardNumber": "accounts_met.num",
		"__tariff": "accounts_met.__name",
		"weight": "accounts_met.weight",
		"weight_units": "accounts_met.weight_units",

		"lastPurchSum": "accounts_met.transactions.sum",
		"lastPurchPlace": "accounts_met.transactions.descr",
		"lastPurchDate": "accounts_met.transactions.time"

    }
};

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|metal_acc|loan)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	if(prefs.source == 'app') {
		mainMobileApp2(prefs, adapter);
		return;
	}
	
    adapter.processRates = adapter.envelope(processRates);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processMetalAccounts = adapter.envelope(processMetalAccounts);
    adapter.processLoans = adapter.envelope(processLoans);
    adapter.fetchNewThanks = adapter.envelope(fetchNewThanks);
	
	var html = login(prefs);
	
	var result = {success: true};
	
	adapter.processRates(html, result);
	adapter.fetchNewThanks(nodeUrl, result);
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'loan') {
		adapter.processLoans(html, result);

		if(!adapter.wasProcessed('loans'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден кредит с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'metal_acc') {
		adapter.processMetalAccounts(html, result);
		
		if(!adapter.wasProcessed('accounts_met'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден металлический счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного металлического счета!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			var num = getParam(info.__name, null, null, /([^,]+)/i);
			if(endsWith(num, prefs.lastdigits))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num, prefs.lastdigits))
				return true;
		}
		case 'loans':
		{
			if(prefs.type != 'loan')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num, prefs.lastdigits))
				return true;
		}	
		case 'accounts_met':
		{
			if(prefs.type != 'metal_acc')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num, prefs.lastdigits))
				return true;
		}
		default:
			return false;
	}
}

function mainMobileApp2(prefs, adapter) {
	if(prefs.type == 'loan')
		throw new AnyBalance.Error('Отображение кредитов не поддерживается в API мобильного приложения. Попробуйте получить данные через сайт.');
	if(prefs.type == 'metal_acc')
		throw new AnyBalance.Error('Отображение металлических счетов не поддерживается в API мобильного приложения. Попробуйте получить данные через сайт.');

	if(AnyBalance.getLevel() < 9) {
		throw new AnyBalance.Error('Для использования API мобильного приложения необходим AnyBalance API v9!');
	}
	
    adapter.processRatesAPI = adapter.envelope(processRatesAPI);
    adapter.processCardsAPI = adapter.envelope(processCardsAPI);
    adapter.processAccountsAPI = adapter.envelope(processAccountsAPI);
    adapter.processThanksAPI = adapter.envelope(processThanksAPI);
	
	var html = loginAPI(prefs);
	
	var result = {success: true};
	
	adapter.processRatesAPI(result);
	adapter.processThanksAPI(result);
	
	if(prefs.type == 'card') {
		adapter.processCardsAPI(result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');
		
	} else if(prefs.type == 'acc') {
		adapter.processAccountsAPI(result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');
	}

	result = adapter.convert(result);
	AnyBalance.setResult(result);
}
