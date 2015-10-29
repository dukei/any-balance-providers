/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

*/

var g_countersTable = {
	common: {
		"fio": "profile.fio",
	}, 
	card: {
		"__tariff": "cards.cardnum",
		
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardnum": "cards.cardnum",
		"type": "cards.type",
		"accnum": "cards.accnum",
		"till": "cards.till",
		"minpay": "cards.minpay",
		"limit": "cards.limit",
		"minpaytill": "cards.minpaytill",
		"cred_ammount": "cards.totalCreditDebtAmount",
		"ownFunds": "cards.ownFunds",
		"clearBalance": "cards.clearBalance",
	},
    acc: {
		"__tariff": "accounts.accnum",
		
		"balance": "accounts.balance",
		"currency": "accounts.currency",
		"type": "accounts.type",
		"accnum": "accounts.accnum",
		"till": "accounts.till",
		"minpay": "accounts.minpay",
		"limit": "accounts.limit",
		"minpaytill": "accounts.minpaytill",
    },
	dep: {
		"__tariff": "deposits.accnum",
		
    	"balance": "deposits.balance",
    	"currency": "deposits.currency",
		"rate": "deposits.rate",
		"accnum": "deposits.accnum",
		"type": "deposits.type",
		"till": "deposits.till",
		"pcts": "deposits.pcts",
    },
	cred: {
		"__tariff": "loans.accnum",
		
    	"balance": "loans.balance",
    	"currency": "loans.currency",
    	"cred_ammount": "loans.cred_ammount",
    	"minpay": "loans.minpay",
    	"paid": "loans.paid",
    	"minpaytill": "loans.minpaytill",
    	"till": "loans.till",
    	"rate": "loans.rate",
    }
};

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(acc|dep|card|cred)$/i.test(prefs.type || ''))
    	prefs.type = 'acc';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	var result = {success: true};
	
	var html = login(prefs, result);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processLoans = adapter.envelope(processLoans);
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);

		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
	} else if(prefs.type == 'cred') {
		adapter.processLoans(html, result);

		if(!adapter.wasProcessed('loans'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
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
			
			if(endsWith(info.__name, prefs.num))
				return true;
		}
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__name, prefs.num))
				return true;
		}
		case 'loans':
		{
			if(prefs.type != 'cred')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__name, prefs.num))
				return true;
		}	
		default:
			return false;
	}
}