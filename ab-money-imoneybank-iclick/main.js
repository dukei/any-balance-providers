/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"currency": "cards.currency",
    	"balance": "cards.balance",
		"status": "cards.status",
		"deadline": "cards.till",
		"acc_num": "cards.accnum",
		"card_num": "cards.cardnum",
		"min_pay": "cards.min_pay",
		"min_pay_till": "cards.min_pay_till",
		"__tariff": "cards.__name"
    },
	acc: {
		"currency": "accounts.currency",
    	"balance": "accounts.balance",
		"type": "accounts.type",
		"status": "accounts.status",
		"acc_num": "accounts.num",
		"__tariff": "accounts.__name"
    },
	dep: {
		"currency": "deposits.currency",
    	"balance": "deposits.balance",
		"type": "deposits.type",
		"status": "deposits.status",
		"acc_num": "deposits.accnum",
		"__tariff": "deposits.__name"
    },
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'accounts':
		case 'cards':
		case 'deposits':
		{
		    if(!prefs.num)
		    	return true;
		    if(info.__name.toLowerCase().indexOf(prefs.num.toLowerCase()) >= 0)
		    	return true;
		    return false;
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|dep)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
    adapter.fetchAccounts = adapter.envelope(fetchAccounts);
    adapter.fetchDeposits = adapter.envelope(fetchDeposits);
    adapter.fetchCards = adapter.envelope(fetchCards);
    adapter.fetchInfo = adapter.envelope(fetchInfo);

	var html = login();

	var result = {success: true};

	adapter.fetchInfo(html, result);

	if(prefs.type == 'card'){

		adapter.fetchCards(result);
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта ' + prefs.num : 'У вас нет ни одной карты');
		result = adapter.convert(result);

	}else if(prefs.type == 'acc'){

		adapter.fetchAccounts(result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет ' + prefs.num : 'У вас нет ни одного счета');
		result = adapter.convert(result);
	
	}else if(prefs.type == 'dep'){

		adapter.fetchDeposits(result);
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит ' + prefs.num : 'У вас нет ни одного депозита');
		result = adapter.convert(result);
	}

	AnyBalance.setResult(result);
}
