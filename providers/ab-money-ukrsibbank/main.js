/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"__forceAvailable": ['cards.accnum'],
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"account": "cards.accnum",
		"acc_name": "cards.accname",
		"own": "accounts.own",
		"debt": "accounts.debt",
		"avail": "accounts.avail",
		"own": "accounts.own",
		"overdraft": "accounts.overdraft",
		"blocked": "accounts.blocked",
		"__tariff": "cards.num",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"account": "accounts.num",
		"acc_name": "accounts.type",
		"own": "accounts.own",
		"debt": "accounts.debt",
		"avail": "accounts.avail",
		"own": "accounts.own",
		"overdraft": "accounts.overdraft",
		"blocked": "accounts.blocked",
		"__tariff": "accounts.num",
    }
};

var g_accountNumberForCard;

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'acc';

    var html = login();
	
    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
	
	var result = {success: true};
	
	adapter.processInfo(html, result);
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');

		g_accountNumberForCard = adapter.traverse(result, 'cards.accnum');

		if(g_accountNumberForCard){
			adapter.processAccounts(html, result);
		}else{
			AnyBalance.trace('Не удалось найти номер счета для карты...');
		}
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');
		
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
			
			if(endsWith(info.__id, prefs.lastdigits))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type == 'acc'){
		        if(!prefs.lastdigits)
		        	return true;
				
				if(endsWith(info.__id, prefs.lastdigits))
					return true;
		    }else if(prefs.type == 'card'){
		    	return endsWith(info.__id, g_accountNumberForCard);
		    }
		}
		default:
			return false;
	}
}
