/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_currency = {
	руб: '₽',
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

function myParseCurrency(text) {
    var val = text.replace(/\s+/g, '').replace(/[\-\d\.,]+/g, '');
    val = g_currency[val] || val;
    return val;
}

var g_countersTable = {
	common: {
		'spasibo': 'spasibo',
		'miles': 'miles',
		'categories': 'categories',
		'sberprime_state': 'sberprime.state',
		'sberprime_till': 'sberprime.till',
		'userName': 'info.fio',
		'userPhone': 'info.phone',
		'eurPurch': 'eurPurch',
		'eurSell': 'eurSell',
		'usdPurch': 'usdPurch',
		'usdSell': 'usdSell',
	}, 
	card: {
    	"balance": "cards.balance",
		"!currency": "cards.currency",
		"cardNumber": "cards.cardNumber",
		"till": "cards.till",
		"status": "cards.status",
		"payment_system": "cards.payment_system",
		"cardName": "cards.cardName",
		"type": "cards.type",
		"minpaydate": "cards.minpay_till",
		"minpay": "cards.minpay",
		"gracepay_till": "cards.gracepay_till",
		"gracepay": "cards.gracepay",
		"maxlimit": "cards.limit",
		"debt": "cards.debt",
		"debt_date": "cards.debt_date",
		"cash": "cards.cash",
		"own": "cards.own",
		"electrocash": "cards.electrocash",
//		"userName": "cards.userName",
		"__tariff": "cards.cardNumber",
		
		"lastPurchSum": "cards.transactions10.sum",
		"lastPurchDate": "cards.transactions10.date",
		"lastPurchPlace": "cards.transactions10.descr",
		"lastPurchType": "cards.transactions10.type"
	},
	loan: {
    	"balance": "credits.balance",
		"!currency": "credits.currency",
		"till": "credits.till",
		
		"minpaydate": "credits.minpay_till",
		"minpay": "credits.minpay",
		"maxlimit": "credits.maxlimit",
		"loan_ammount": "credits.limit",
		"cash": "credits.cash",
//		"userName": "credits.userName",
		"cardNumber": "credits.num",
		"__tariff": "credits.num",
	},
    acc: {
    	"balance": "accounts.balance",
		"!currency": "accounts.currency",
		"rate": "accounts.pct",
		"cardNumber": "accounts.num",
		"__tariff": "accounts.num",
		"pct": "accounts.pct",
		"till": "accounts.till",
		"status": "accounts.status",
		"pct_next_date": "accounts.pct_next_date",
		"cash": "accounts.cash",
//		"userName": "accounts.userName",
		"cardName": "accounts.cardName",
		"type": "accounts.type",
		"balance_min": "accounts.balance_min",
		
		"lastPurchSum": "accounts.transactions10.sum",
		"lastPurchDate": "accounts.transactions10.date",
		"lastPurchPlace": "accounts.transactions10.descr",
		"lastPurchType": "accounts.transactions10.type"
    },
	metal_acc: {
    	"balance": "accounts_met.balance",
    	"!currency": "accounts_met.currency",
		"cardNumber": "accounts_met.num",
		"__tariff": "accounts_met.__name",
		"weight": "accounts_met.weight",
		"weight_units": "accounts_met.weight_units",

		"lastPurchSum": "accounts_met.transactions.sum",
		"lastPurchDate": "accounts_met.transactions.date",
		"lastPurchPlace": "accounts_met.transactions.descr",
		"lastPurchType": "accounts_met.transactions.type"
    }
};

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setOptions({cookiePolicy: 'rfc2965'});
	
    if(!/^(card|acc|metal_acc|loan)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
//	if(prefs.source == 'app') { // Через сайт больше не работает
		mainMobileApp2(prefs, adapter);
		return;
//	}
    adapter.processRates = adapter.envelope(processRates);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processMetalAccounts = adapter.envelope(processMetalAccounts);
    adapter.processLoans = adapter.envelope(processLoans);
    adapter.fetchNewThanks = adapter.envelope(fetchNewThanks);
	
	var html = login(prefs);
	
	var result = {success: true};
	
	adapter.processRates(nodeUrl, result);
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

		if(!adapter.wasProcessed('credits'))
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
			
			var num = getParam(info.__name, /([^,]+)/i, [/\s+/g, '']);
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
		case 'credits':
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
		throw new AnyBalance.Error('Кредиты пока не поддерживаются. Обратитесь к автору провайдера для добавления продукта');
//		throw new AnyBalance.Error('Отображение кредитов не поддерживается в API мобильного приложения. Попробуйте получить данные через сайт');
	if(prefs.type == 'metal_acc')
		throw new AnyBalance.Error('Металлические счета пока не поддерживаются. Обратитесь к автору провайдера для добавления продукта');
//		throw new AnyBalance.Error('Отображение металлических счетов не поддерживается в API мобильного приложения. Попробуйте получить данные через сайт');

	if(AnyBalance.getLevel() < 9)
		throw new AnyBalance.Error('Для использования API мобильного приложения необходим AnyBalance API v9!');
	
    adapter.processRatesAPI = adapter.envelope(processRatesAPI);
	adapter.processInfoAPI = adapter.envelope(processInfoAPI);
    adapter.processCardsAPI = adapter.envelope(processCardsAPI);
    adapter.processAccountsAPI = adapter.envelope(processAccountsAPI);
    adapter.processThanksAPI = adapter.envelope(processThanksAPI);
	adapter.processSberPrimeAPI = adapter.envelope(processSberPrimeAPI);
	
	var html = loginAPI(prefs);
	
	var result = {success: true};
	
	adapter.processRatesAPI(result);
	adapter.processInfoAPI(result);
	adapter.processThanksAPI(result);
	adapter.processSberPrimeAPI(result);
	
	if(prefs.type == 'card'){
		adapter.processCardsAPI(result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');
		
	}else if(prefs.type == 'acc'){
		adapter.processAccountsAPI(result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');
	}

	result = adapter.convert(result);
	AnyBalance.setResult(result);
}
