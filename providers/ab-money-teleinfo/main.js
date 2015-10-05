/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"currency": ["cards.currency", "accounts.currency"],
    	"balance": ["cards.balance", "accounts.balance"],
		"minpay": "cards.minpay",
		"minpay_till": "cards.minpay_till",
		"gracepay": "cards.gracepay",
		"gracepay_till": "cards.gracepay_till",
    	"blocked": "cards.blocked",
		"own": "cards.own",
		"limit": "cards.limit",
		"till": ["cards.till", "accounts.till"],
		"pct": "cards.pct",
		"cardname": ["cards.name", "accounts.name"],
		"cardnum": "cards.num",
		"accnum": "accounts.num",
		"fio": "cards.holder",
		"__tariff": ["cards.__name", "accounts.name"]
    },
    crd: {
		"currency": "credits.currency",
    	"balance": "credits.balance",
		"minpay": "credits.minpay",
		"minpay_till": "credits.minpay_till",
		"gracepay": "credits.gracepay",
		"gracepay_till": "credits.gracepay_till",
		"limit": "credits.limit",
		"credit_till": "credits.till",
		"pct": "credits.pct",
		"cardname": "credits.__name",
		"cardnum": "credits.num",
		"accnum": "credits.accnum",
		"__tariff": "credits.__name"
    },
    dep: {
		"currency": "deposits.currency",
    	"balance": "deposits.balance",
		"accnum": "deposits.num",
		"till": "deposits.date_end",
		"pct": "deposits.pct",
		"own": "deposits.own",
		"__tariff": "deposits.__name"
    }
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'cards':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'card')
				return false;
			return endsWith(info.num, prefs.card);
		}
		case 'accounts':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'card')
				return false;
			return endsWith(info.num, prefs.card);
		}
		case 'deposits':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'dep')
				return false;
			return endsWith(info.num, prefs.card);
		}
		case 'credits':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'crd')
				return false;
			return endsWith(info.num, prefs.card);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    if(prefs.source == 'site'){
		AnyBalance.trace('В настройках выбрано обновление из интернет-банка');
		mainWeb();
		return;
    }

	AnyBalance.trace('В настройках выбрано обновление из мобильного приложения');

	if(!AnyBalance.getCapabilities){
		AnyBalance.trace('Бинарные запросы не поддерживаются. Пока будем обновлять из веба...');
		mainWeb();
		return;
	}

    if(!/^(card|dep|crd)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processInfo = adapter.envelope(processInfo);

	login();

	var result = {success: true};

	//adapter.processInfo(html, result);

	if(prefs.type == 'card'){

		adapter.processCards(result);
		if(!adapter.wasProcessed('cards')){
			result.cards = [];
			adapter.processAccounts(result);
			if(!adapter.wasProcessed('accounts')) {
				throw new AnyBalance.Error(prefs.card ? 'Не найдены ни карта, ни счет с последними цифрами ' + prefs.card : 'У вас нет ни одной карты или счета');
			}
		}
		result = adapter.convert(result);

	}else if(prefs.type == 'dep'){

		adapter.processDeposits(result);
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.card ? 'Не найден депозит с последними цифрами ' + prefs.card : 'У вас нет ни одного депозита');
		result = adapter.convert(result);

	}else if(prefs.type == 'crd'){

		adapter.processCredits(result);
		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.card ? 'Не найден кредит с последними цифрами ' + prefs.card : 'У вас нет ни одного кредита');
		result = adapter.convert(result);

	}

	AnyBalance.setResult(result);
}
