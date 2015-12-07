/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"balance": "cards.balance",
		"num": "cards.num",
		"blocked": "cards.blocked",
		"available": "cards.available",
		"status": "cards.status",
		"type": "cards.type",
		"accnum": "cards.accnum",
		"limit": "cards.limit",
		"currency": "cards.currency",
		"__tariff": "cards.__name"
	}, 
	crd: {
		__forceAvailable: ['credits.accnum'],
		"balance": "accounts.balance",
		"penalty": "credits.penalty",
		"minpaytill": "credits.minpaytill",
		"num": "credits.num",
		"accnum": "credits.accnum",
		"pct": "credits.pct",
		"limit": "credits.limit",
		"currency": "accounts.currency",
		"__tariff": "credits.__name",
		"blocked": "accounts.blocked",
		"available": "accounts.available",
	},
    acc: {
		"balance": "accounts.balance",
		"blocked": "accounts.blocked",
		"available": "accounts.available",
		"status": "status",
		"type": "accounts.type",
		"accnum": "accounts.num",
		"pct": "accounts.pct",
		"currency": "accounts.currency",
		"__tariff": "accounts.__name",
    },
	dep: {
    }
};

var g_accnum;
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
			}else if(prefs.type == 'crd'){
				if(g_accnum)
					return info.num == g_accnum;
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

    if(/^(dep)$/i.test(prefs.type || ''))
    	throw new AnyBalance.Error('Не удалось получить информацию по депозиту. Сайт изменен?');
    	
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

		g_accnum = result.credits[0].accnum;
		adapter.processAccounts(html, result);
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}
