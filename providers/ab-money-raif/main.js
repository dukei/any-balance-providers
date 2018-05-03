/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

*/

var g_countersTable = {
	common: {
		"fio": "info.fio",
	}, 
	card: {
		"__tariff": "cards.__name",
		
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardnum": "cards.num",
		"type": "cards.type",
		"accnum": "cards.accnum",
		"till": "cards.till",
		"minpay": "cards.minpay",
		"limit": "cards.limit",
		"minpaytill": "cards.minpay_till",
		"cred_ammount": "cards.totalCreditDebtAmount",
		"ownFunds": "cards.own",
		"clearBalance": "cards.clearBalance",
		"gracePeriodOutstanding": "cards.gracePeriodOutstanding",
		"unpaidGracePeriodDue": "cards.gracepay",
		"gracePeriodEnd": "cards.gracepay_till",
	},
    acc: {
		"__tariff": "accounts.__name",
		
		"balance": "accounts.balance",
		"currency": "accounts.currency",
		"type": "accounts.type",
		"accnum": "accounts.num",
		"till": "accounts.till",
		"minpay": "accounts.minpay",
		"limit": "accounts.limit",
		"minpaytill": "accounts.minpay_till",
    },
	dep: {
		"__tariff": "deposits.__name",
		
    	"balance": "deposits.balance",
    	"currency": "deposits.currency",
		"rate": "deposits.pct",
		"accnum": "deposits.num",
		"type": "deposits.type",
		"till": "deposits.till",
		"pcts": "deposits.pcts",
    },
	cred: {
		"__tariff": "credits.__name",
		
    	"balance": "credits.balance",
    	"currency": "credits.currency",
    	"cred_ammount": "credits.limit",
		"accnum": "cards.num",
    	"minpay": "credits.minpay",
    	"paid": "credits.paid",
    	"minpaytill": "credits.minpay_till",
    	"till": "credits.till",
    	"rate": "credits.pct",
    	"paidLoanIntrest": "credits.paidLoanIntrest",
    }
};

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(acc|dep|card|cred)$/i.test(prefs.type || ''))
    	prefs.type = 'acc';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	var result = {success: true};
	
	var html = login(result);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processLoans = adapter.envelope(processLoans);
	
	if(prefs.type == 'card') {
		adapter.processCards(result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(result);

		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
	} else if(prefs.type == 'cred') {
		adapter.processLoans(result);

		if(!adapter.wasProcessed('credits'))
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
		case 'credits':
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