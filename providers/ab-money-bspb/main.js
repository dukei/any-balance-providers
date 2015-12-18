/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'bonus': 'bonus',
		'fio': 'info.fio'
	}, 
	card: {
		"__forceAvailable": ["cards.account_id"],
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"num": "cards.num",
		"__tariff": "cards.__name",
		"status": "cards.status",
		"till": "cards.till",
		"accnum": "accounts.num",
	},
	crd: {
    	"balance": "credits.balance",
    	"num": "credits.num",
		"currency": "credits.currency",
    	"limit": "credits.limit",
		"debt": "credits.debt",
		"peni": "credits.peni",
		"needpaytill": "credits.schedule.date",
		"needpay": "credits.schedule.sum",
		"accnum": "credits.num",
		"pct": "credits.pct",
		"type": "credits.type",
		"till": "credits.date_end",
		"__tariff": "credits.__name",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"__tariff": "accounts.__name",
		"num": "accounts.num",
    },
	dep: {
    	"balance": "deposits.balance",
		"currency": "deposits.currency",
		"num": "deposits.num",
		"accnum": "deposits.num_service",
		"pct": "deposits.pct",
		"type": "deposits.type",
		"till": "deposits.date_end",
		"__tariff": "deposits.__name",
		"status": "deposits.status"
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
			
			if(endsWith(info.num, prefs.num))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type == 'acc'){
		        if(!prefs.num)
		        	return true;
				
				if(endsWith(info.num, prefs.num))
					return true;
			}else if(prefs.type == 'card'){
				return shouldProcess.selectedAccountId == info.__id;
			}else{
				return false;
			}
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
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processBonus = adapter.envelope(processBonus);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login(prefs);
	
	var result = {success: true};

	adapter.processInfo(html, result);
	adapter.processBonus(html, result);
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);

		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');

		shouldProcess.selectedAccountId = result.cards[0].account_id;
		adapter.processAccounts(html, result);
		
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
