/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	cards: {
    	"balance": "cards.balance",
    	"currency": "cards.currency",
		"till": "cards.till",
		"blocked": "cards.blocked",
		"num": "cards.num",
		"__tariff": "cards.__name",
		"type": "cards.type",
		"sms": "cards.sms",
    },
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'cards':
		{
		    if(!prefs.num)
		    	return true;
		    return new RegExp(prefs.num + '$').test(info.__id);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    var adapter = new NAdapter(g_countersTable['cards'], shouldProcess);
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processCards = adapter.envelope(processCards);

	var html = login();

	var result = {success: true};

	adapter.processInfo(html, result);

	adapter.processCards(html, result);
	if(!adapter.wasProcessed('cards'))
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'У вас нет ни одной карты');
	result = adapter.convert(result);

	AnyBalance.setResult(result);
}
