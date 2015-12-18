/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"currency": "cards.currency",
    	"balance": "cards.balance",
    	"blocked": "cards.blocked",
		"minpay": "cards.minpay",
		"minpay_till": "cards.minpay_till",
		"limit": "cards.limit",
		"till": "cards.till",
		"overlimit": "cards.overlimit",
		"accnum": "cards.accnum",
		"comissiondebt": "cards.debt_comission",
		"cardnum": "cards.num",
		"__tariff": "cards.__name"
    },
	acc: {
		"currency": "accounts.currency",
    	"balance": "accounts.balance",
		"accnum": "accounts.accnum",
		"accname": "accounts.type",
		"__tariff": "accounts.num"
    },
    crd: {
		"currency": "credits.currency",
    	"balance": "credits.balance",
		"minpay": "credits.minpay",
		"minpay_till": "credits.minpay_till",
		"accnum": "credits.accnum",
		"till": "credits.date_end",
		"pct": "credits.pct",
		"__tariff": "credits.__name"
    },
    dep: {
		"currency": "deposits.currency",
    	"balance": "deposits.balance",
		"accnum": "deposits.num",
		"nextpct": "deposits.next_pct",
		"till": "deposits.date_end",
		"pct": "deposits.pct",
		"__tariff": "deposits.__name"
    }
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'cards':
		{
		    if(!prefs.contract)
		    	return true;
			if(prefs.type != 'card')
				return false;
			return endsWith(info.num, prefs.contract);
		}
		case 'accounts':
		{
		    if(!prefs.contract)
		    	return true;
			if(prefs.type != 'acc')
				return false;
			return endsWith(info.num, prefs.contract);
		}
		case 'deposits':
		{
		    if(!prefs.contract)
		    	return true;
			if(prefs.type != 'dep')
				return false;
			return endsWith(info.num, prefs.contract);
		}
		case 'credits':
		{
		    if(!prefs.contract)
		    	return true;
			if(prefs.type != 'crd')
				return false;
			return endsWith(info.agreement, prefs.contract);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|dep|crd)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processInfo = adapter.envelope(processInfo);

	var html = login();

	var result = {success: true};

	//adapter.processInfo(html, result);

	if(prefs.type == 'card'){

		adapter.processCards(html, result);
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найдена карта с последними цифрами ' + prefs.contract : 'У вас нет ни одной карты');
		result = adapter.convert(result);

	}else if(prefs.type == 'acc'){

		adapter.processAccounts(html, result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найден счет с последними цифрами ' + prefs.contract : 'У вас нет ни одного счета');
		result = adapter.convert(result);

	}else if(prefs.type == 'dep'){

		adapter.processDeposits(html, result);
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найден депозит с последними цифрами ' + prefs.contract : 'У вас нет ни одного депозита');
		result = adapter.convert(result);

	}else if(prefs.type == 'crd'){

		adapter.processCredits(html, result);
		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найден кредит с последними цифрами ' + prefs.contract : 'У вас нет ни одного кредита');
		result = adapter.convert(result);

	}

	AnyBalance.setResult(result);
}
