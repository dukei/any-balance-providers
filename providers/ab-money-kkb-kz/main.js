/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"bonus": "bonus",
		"fio": "info.fio",
	},
	card: {
		"balance": "cards.balance_kzt",
		"balance_usd": "cards.balance_usd",
		"balance_eur": "cards.balance_eur",
		"blocked": "cards.blocked",
		"available": "cards.available",
		"repayment": "cards.minpay",
		"account": "cards.num",
		"accnum": "cards.accnum",
		"till": "cards.till",
		"currency": "cards.currency",
		"limit": "cards.limit",
		"__tariff": "cards.__name",
	},
	crd: {
		"balance": "credits.balance",
		"account": "credits.num",
		"__tariff": "credits.__name",
	},
    acc: {
		"balance": "accounts.balance",
		"blocked": "accounts.blocked",
		"currency": "accounts.currency",
		"account": "accounts.num",
		"__tariff": "accounts.__name",
    },
	dep: {
		"balance": "deposits.balance",
		"available": "deposits.available",
		"repayment": "deposits.repayment",
		"account": "deposits.num",
		"currency": "deposits.currency",
		"pcts": "deposits.pcts",
		"rate": "deposits.pct",
		"till": "deposits.till",
		"__tariff": "deposits.__name",
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
			
			if(endsWith(info.num, prefs.num))
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

    if(/crd/i.test(prefs.type))
    	throw new AnyBalance.Error('Не удалось получить данные по депозиту. Сайт изменен?');
	
    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
//    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processBonuses = adapter.envelope(processBonuses);
    adapter.processInfo = adapter.envelope(processInfo);
	
	var result = {success: true};
  
	var html = login(result);

	adapter.processInfo(result);
	adapter.processBonuses(result);
	
	if(prefs.type == 'card') {
		adapter.processCards(result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
	} else if(prefs.type == 'crd') {
		adapter.processCredits(result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
	}
	
	result = adapter.convert(result);

	AnyBalance.setResult(result);
}
