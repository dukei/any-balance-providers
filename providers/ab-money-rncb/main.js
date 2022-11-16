/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

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

var g_state = {
	ACTIVE: 'Активен',
	INACTIVE: 'Неактивен',
	BLOCKED: 'Заблокирован',
	OPENED: 'Открыт',
	CLOSED: 'Закрыт',
	ARRESTED: 'Арестован',
	undefined: ''
};

var g_type = {
	DEPOSIT: 'Вклад',
	PDEPOSIT: 'Вклад',
	CURRENT: 'Текущий',
	PCURRENT: 'Текущий',
	SAVINGS: 'Накопительный',
	PSAVINGS: 'Накопительный',
	undefined: ''
};

var g_countersTable = {
	common: {
		'phone': 'info.phone',
		'fio': 'info.fio'
	}, 
	card: {
    	"balance": "cards.balance",
    	"availableAmount": "cards.availableAmount",
    	"lockedAmount": "cards.lockedAmount",
		"lockedAmount": "cards.creditLimit",
    	"contractNumber": "cards.contractNumber",
		"currency": "cards.currency",
		"statusDescription": "cards.statusDescription",
		"number": "cards.number",
		"formattedName": "cards.formattedName",
		"type": "cards.type",
		"openDate": "cards.openDate",
		"endDate": "cards.endDate",
		"expireDate": "cards.expireDate",
		"__tariff": "cards.number",
	},
	acc: {
    	"balance": "accounts.balance",
    	"contractNumber": "accounts.contractNumber",
		"currency": "accounts.currency",
		"statusDescription": "accounts.statusDescription",
		"formattedName": "accounts.formattedName",
		"accountType": "accounts.accountType",
		"percent": "accounts.percent",
		"openDate": "accounts.openDate",
		"endDate": "accounts.endDate",
		"__tariff": "accounts.contractNumber",
	},
	dep: {
    	"balance": "deposits.balance",
    	"contractNumber": "deposits.contractNumber",
		"currency": "deposits.currency",
		"statusDescription": "deposits.statusDescription",
		"formattedName": "deposits.formattedName",
		"accountType": "deposits.accountType",
		"percent": "deposits.percent",
		"openDate": "deposits.openDate",
		"endDate": "deposits.endDate",
		"__tariff": "deposits.contractNumber",
	},
	crd: {
    	"balance": "credits.balance",
    	"contractNumber": "credits.contractNumber",
		"currency": "credits.currency",
		"statusDescription": "credits.statusDescription",
		"formattedName": "credits.formattedName",
		"accountType": "credits.accountType",
		"percent": "credits.percent",
		"openDate": "credits.openDate",
		"endDate": "credits.endDate",
		"__tariff": "credits.contractNumber",
	},
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
			
			if(endsWith(info.__name, prefs.num))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__name, prefs.num))
				return true;
		}
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__name, prefs.num))
				return true;
		}
		case 'credits':
		{
			if(prefs.type != 'crd')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__name, prefs.num))
				return true;
		}
		default:
			return false;
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
    if(!/^(card|acc|dep|crd)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
	var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    var result = {success: true};
	
	adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
	adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processCredits = adapter.envelope(processCredits);
	adapter.processInfo = adapter.envelope(processInfo);
	
	var json = login(prefs);
	
	if(prefs.type == 'card') {
		adapter.processCards(result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
	} else if(prefs.type == 'crd') {
		adapter.processCredits(result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
	}
	
	adapter.processInfo(result);
	
	result = adapter.convert(result);
	
	AnyBalance.setResult(result);
}
