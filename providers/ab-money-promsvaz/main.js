/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'bonuses': 'bonuses',
		'bonuses_grade': 'bonuses_grade',
		'fio': 'info.fio'
	}, 
	card: {
		"__forceAvailable": ["cards.accnum"],
        "balance": "cards.balance",
		"till": "cards.till",
//		"income": "income",
		"cardnum": "cards.num",
		"type": "cards.name",
		"balance_own": "accounts.balance_own",
		"minpay": "cards.minpay",
		"minpaytill": "cards.minpaytill",
		"gracepay": "accounts.gracepay",
		"gracepaytill": "accounts.gracepaytill",
		"blocked": "cards.blocked",
		"accnum": "cards.accnum",
		"currency": "cards.currency",
		"__tariff": "cards.__name"
	},
    acc: {
        "balance": "accounts.balance",
		"balance_own": "accounts.balance_own",
		"minpay": "accounts.minpay",
		"minpaytill": "accounts.minpaytill",
		"gracepay": "accounts.gracepay",
		"gracepaytill": "accounts.gracepaytill",
		"blocked": "accounts.blocked",
		"accnum": "accounts.num",
		"currency": "accounts.currency",
		"__tariff": "accounts.__name"
    },
};

var g_selectedCard;
function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	if(!info || (!info.__id || !info.__name))
		return false;
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.lastdigits || 
					endsWith(info.num, prefs.lastdigits)){
				g_selectedCard = info;
				return true;
			}
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type == 'acc'){
		    	if(!prefs.lastdigits)
		    		return true;
			
				if(endsWith(info.num, prefs.lastdigits))
					return true;
			}else if(prefs.type == 'card'){
				return info.num == g_selectedCard.accnum;
			}
		}
		case 'credits':
		{
			if(prefs.type != 'crd')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num, prefs.lastdigits))
				return true;
		}	
		case 'deposits':
		{
			if(prefs.type != 'dep')
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

function main() {
	var prefs = AnyBalance.getPreferences();
	
    if(!/^(card|crd|dep|acc)$/.test(prefs.type || ''))
    	prefs.type = 'card';

    if(/dep|crd/.test(prefs.type))
    	throw new AnyBalance.Error('Не удалось получить данные по кредиту/депозиту. Сайт изменен?');
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processBonuses = adapter.envelope(processBonuses);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
//    adapter.processCredits = adapter.envelope(processCredits);
//    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login(prefs);
	
	var result = {success: true};

	adapter.processInfo(html, result);
	adapter.processBonuses(html, result);
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			adapter.processCards(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'crd') {
		adapter.processCredits(html, result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден кредит с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден депозит с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}
