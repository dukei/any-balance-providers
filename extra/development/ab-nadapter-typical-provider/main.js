/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'bonuses': 'bonuses',
		'fio': 'info.fio'
	}, 
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardnum": "cards.cardnum",
		"__tariff": "cards.cardnum",
		"name": "cards.type",
		"status": "cards.status",
		"till": "cards.till",
		"accnum": "cards.acc_num",
		'needpay': 'cards.needpay',
		'gracepay': 'cards.gracepay',
		'gracepaytill': 'cards.gracepaytill',
		'pct': 'cards.pct',
		'credit': 'cards.credit',
		'limit': 'cards.limit',
	},
	crd: {
    	"balance": "credits.balance",
    	"limit": "credits.limit",
		"currency": "credits.currency",
		"latedebt": "credits.penalty",
		"needpaytill": "credits.minpaydate",
		"needpay": "credits.minpay",
		"accnum": "credits.acc_num",
		"pctcredit": "credits.pct",
		"__tariff": "credits.__name",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"name": "accounts.type",
		"cardnum": "accounts.cardnum",
		"rate": "accounts.pct",
		"__tariff": "accounts.num",
    },
	dep: {
    	"balance": "deposits.balance",
    	"currency": "deposits.currency",
		"pctcredit": "deposits.pct",
		"accnum": "deposits.acc_num",
		"till": "deposits.date_end",
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
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
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
	
	// getParam(html, result, 'bonuses', /МКБ Бонус\s*<span[^>]*>([\s\d]+)&nbsp;баллов/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}
