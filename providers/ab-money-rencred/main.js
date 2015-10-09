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
    	"balance": "cards.balance",
		"minpay": "cards.minpay",
		"minpaytill": "cards.minpaytill",
    	"blocked": "cards.blocked",
		"limit": "cards.limit",
		"cardnum": "cards.num",
		"accnum": "cards.accnum",
		"accname": "cards.type",
		"userName": "cards.userName",
		"status": "cards.status",
		"available": "cards.cash",
		"__tariff": "cards.__name"
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
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    if(!/^(card|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    if(prefs.type == 'acc')
    	throw new AnyBalance.Error('Не удаётся получить счет. Сайт изменен?');

    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
    adapter.processBonus = adapter.envelope(processBonus);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processInfo = adapter.envelope(processInfo);

	var html = login();

	var result = {success: true};

	adapter.processBonus(html, result);

	if(prefs.type == 'card'){
		adapter.processCards(html, result);
		if(!adapter.wasProcessed('cards')){
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найдена карта с последними цифрами ' + prefs.cardnum : 'У вас нет ни одной карты');
		}
		result = adapter.convert(result);
	}

	AnyBalance.setResult(result);
}
