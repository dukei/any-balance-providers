/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'fio' : 'info.fio'
	},
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"till": "cards.till",
		"accnum": "cards.num",
		"accname": "cards.accnum",
		"__tariff": "cards.__name"
    },
	acc: {
		"currency": "accounts.currency",
    	"balance": "accounts.balance",
		"accnum": "accounts.num",
		"accname": "accounts.type",
		"__tariff": "accounts.__name"
    },
	dep: {
		"currency": "deposits.currency",
    	"balance": "deposits.balance",
		"accnum": "deposits.num",
		"accname": "deposits.type",
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
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    if(prefs.type == 'crd')
    	throw new AnyBalance.Error('Не удаётся получить информацию по кредиту. Сайт изменен?');

    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCards = adapter.envelope(processCards);
    //adapter.processDeposits = adapter.envelope(processDeposits);
	//adapter.processCredits = adapter.envelope(processCredits);
    adapter.processInfo = adapter.envelope(processInfo);

	var html = login();

	var result = {success: true};

	adapter.processInfo(result);

	if(prefs.type == 'card'){

		adapter.processCards(result);
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найдена карта с последними цифрами ' + prefs.contract : 'У вас нет ни одной карты');
		result = adapter.convert(result);

	}else if(prefs.type == 'acc'){

		adapter.processAccounts(result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найден счет с последними цифрами ' + prefs.contract : 'У вас нет ни одного счета');
		result = adapter.convert(result);
	}

	AnyBalance.setResult(result);
}

