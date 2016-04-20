/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
/*
<counter id="balance" name="Баланс" units=" {@currency}"/>
<counter id="amount" name="Остаток" units=" {@currency}"/>
<counter id="limit" name="Кредитный лимит" units=" {@currency}"/>
<counter id="cardnum" name="Номер карты" type="text"/>
<counter id="till" name="Срок действия" type="time" format="MM/yy"/>
<counter id="acc_num" name="Номер счета карты" type="text"/>
<counter id="fio" name="Владелец" type="text"/>
<counter id="currency" name="Валюта" type="text"/>
<counter id="type" name="Название" type="text"/>
*/
var g_countersTable = {
	common: {
		'bonuses': 'bonuses',
		'fio': 'info.fio'
	}, 
	card: {
    	"balance": "cards.balance",
    	"amount": "cards.amount",
		'limit': 'cards.limit',
		"cardnum": "cards.num",
		"till": "cards.till",
		"acc_num": "cards.acc_num",
		"fio": "cards.holderName",
		"currency": "cards.currency",
		"type": "cards.name",
		"__tariff": "cards.num",
	},
	crd: {
    	// "balance": "credits.balance",
    	// "limit": "credits.limit",
		// "currency": "credits.currency",
		// "latedebt": "credits.penalty",
		// "needpaytill": "credits.minpaydate",
		// "needpay": "credits.minpay",
		// "accnum": "credits.acc_num",
		// "pctcredit": "credits.pct",
		// "__tariff": "credits.__name",
	},
    acc: {
    	// "balance": "accounts.balance",
		// "currency": "accounts.currency",
		// "name": "accounts.type",
		// "cardnum": "accounts.cardnum",
		// "rate": "accounts.pct",
		// "__tariff": "accounts.num",
    },
	dep: {
		"balance": "deposits.balance",
    	"amount": "deposits.amount",
    	"pct": "deposits.pct",
		'limit': 'deposits.limit',
		"acc_num": "deposits.num",
		"till": "deposits.till",
		"fio": "deposits.holderName",
		"currency": "deposits.currency",
		"type": "deposits.name",
		"__tariff": "deposits.num",
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
    // adapter.processCredits = adapter.envelope(processCredits);
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
	} /*else if(prefs.type == 'crd') {
		adapter.processCredits(html, result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	}*/else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}
