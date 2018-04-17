/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
    	"balance": "cards.balance",
    	"own": "cards.own",
		"currency": "cards.currency",
		"cardnum": "cards.num",
		"__tariff": "cards.__name",
		"name": "cards.name",
		"status": "cards.status",
		"till": "cards.till",
		"accnum": "cards.accnum",
		'available_cash': 'cards.available_cash',
		'limit': 'cards.limit',
		'limit_cash': 'cards.limit_cash',
		'fio': 'cards.holder',
		'debt': 'cards.debt',
		'bonus': 'cards.bonus',
	},
	crd: {
    	"balance": "credits.balance",
		"currency": "credits.currency",
		"cardnum": "credits.num",
		"__tariff": "credits.__name",
		"name": "credits.type",
		"till": "credits.till",
		"minpay_till": "credits.minpay_till",
		"accnum": "credits.accnum",
		'limit': 'credits.limit',
		'fio': 'info.fio',
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"name": "accounts.name",
		"accnum": "accounts.num",
		"fio": "accounts.owner",
		"__tariff": "accounts.__name",
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
			
			if(endsWith(info.num, prefs.num))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num))
				return true;
		}
		case 'credits':
		{
			if(prefs.type != 'crd')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num))
				return true;
		}	
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num))
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

    if(/dep/i.test(prefs.type))
    	throw new AnyBalance.Error('Не удаётся получить депозит. Сайт изменен?');
	
    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
//    adapter.processDeposits = adapter.envelope(processDeposits);
	
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
		adapter.processCredits(html, result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}
