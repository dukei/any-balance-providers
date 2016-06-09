/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'fio': 'info.fio'
	}, 
	card: {
	},
	crd: {
	},
    acc: {
		"balance": "accounts.balance",
		"available": "accounts.available",
		"last_transaction_date": "accounts.last_transaction_date",
		"pct": "accounts.pct",
		"limit": "accounts.limit",
		"num": "accounts.num",
		"name": "accounts.name",
		"fio": "accounts.fio",
		"currency": "accounts.currency",
    },
	dep: {
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
    	prefs.type = 'acc';

    if('acc' != prefs.type)
    	throw new AnyBalance.Error('Can not find selected bank product. Is the site changed?');
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
//    adapter.processCredits = adapter.envelope(processCredits);
//    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login(prefs);
	
	var result = {success: true};
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Could not find a card with last digits ' + prefs.num : 'You have no cards!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Could not find an account with last digits ' + prefs.num : 'You have no accounts!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'crd') {
		adapter.processCredits(html, result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Could not find a loan with last digits ' + prefs.num : 'You have no loans!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Could not find a deposit with last digits ' + prefs.num : 'You have no deposits!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}
