/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"bonus": "bonus",
	},
	card: {
		"currency": "cards.currency",
		"currencycode": "cards.currencycode",
    	"balance": "cards.balance",
		"minpay": "cards.minpay",
		"minpaytill": "cards.minpay_till",
    	"blocked": "cards.blocked",
		"limit": "cards.limit",
		"own": "cards.own",
		"cardnum": "cards.num",
		"contract": "cards.contract",
		"payperiodlastdate": "cards.payperiodlastdate",
		"accnum": "cards.accnum",
		"accname": "cards.type",
		"userName": "info.fio",
		"status": "cards.status",
		"available": "cards.cash",
		"__tariff": "cards.__name"
    },
	crd: {
		"currency": "credits.currency",
		"currencycode": "cards.currencycode",
    	"balance": "credits.balance",
		"minpay": "credits.minpay",
		"minpaytill": "credits.minpay_till",
		"limit": "credits.limit",
		"own": "credits.own",
		"cardnum": "credits.num",
		"contract": "credits.contract",
		"payperiodlastdate": "credits.payperiodlastdate",
		"accnum": "credits.accnum",
		"accname": "credits.name",
		"status": "credits.status",
		"userName": "info.fio",
		"__tariff": "credits.__name"
    },
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'cards':
		{
		    if(!prefs.cardnum)
		    	return true;
			if(prefs.type != 'card')
				return false;
			return endsWith(info.num, prefs.cardnum);
		}
		case 'credits':
		{
		    if(!prefs.cardnum)
		    	return true;
			if(prefs.type != 'crd')
				return false;
			return endsWith(info.num, prefs.cardnum);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    if(!/^(card|acc|crd)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    if(prefs.type == 'acc')
    	throw new AnyBalance.Error('Не удаётся получить счет. Сайт изменен?');

    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
    adapter.processBonus = adapter.envelope(processBonus);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processInfo = adapter.envelope(processInfo);

	var clientInfo = login();

	var result = {success: true};

	adapter.processBonus(result);
	adapter.processInfo(clientInfo, result);

	if(prefs.type == 'card'){
		adapter.processCards(result);
		if(!adapter.wasProcessed('cards')){
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найдена карта с последними цифрами ' + prefs.cardnum : 'У вас нет ни одной карты');
		}
		result = adapter.convert(result);
	}
	if(prefs.type == 'crd'){
		adapter.processCredits(result);
		if(!adapter.wasProcessed('credits')){
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден кредит с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного кредита');
		}
		result = adapter.convert(result);
	}

	AnyBalance.setResult(result);
}
