/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

*/

var g_countersTable = {
	common: {
		
		
	}, 
	card: {
		"__tariff": "cards.cardnum",
		
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardnum": "cards.cardnum",
		"type": "cards.type",
		"status": "cards.status",
		"fio": "cards.fio",
		"till": "cards.till",
	},
    acc: {
		"__tariff": "accounts.accnum",
		
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"number": "accounts.accnum",
		"type": "accounts.type",
		"status": "accounts.status",
    },
	dep: {
		"__tariff": "deposits.accnum",
		
    	"balance": "deposits.balance",
    	"currency": "deposits.currency",
		"rate": "deposits.rate",
		"number": "deposits.accnum",
		"type": "deposits.type",
		"status": "deposits.status",
		"till": "deposits.till",
		"contract": "deposits.contract",
    }
};

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|dep)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	var json = login(prefs);
	
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var result = {success: true};
	
	if(prefs.type == 'card') {
		adapter.processCards(json, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найдена карта с последними цифрами ' + prefs.cardnum : 'У вас нет ни одной карты!');
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(json, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден счет с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного счета!');
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(json, result);

		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден депозит с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного депозита!');
	}
	result = adapter.convert(result);
	
	AnyBalance.setResult(result);
}


function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(info.__id, prefs.cardnum))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(info.__id, prefs.cardnum))
				return true;
		}
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(info.__id, prefs.cardnum))
				return true;
		}	
		default:
			return false;
	}
}