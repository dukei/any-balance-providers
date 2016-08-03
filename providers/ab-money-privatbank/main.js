/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"phone": "info.mphone",
	}, 
	card: {
		"__tariff": "cards.__name",
		
    	"balance": "cards.balance",
		"card_number": "cards.num",
		"card_name": "cards.__name",
		"type": "cards.type",
		"status": "cards.status",
		"currency": "cards.currency",
		"limit": "cards.limit",
		"min_pay": "cards.minpay",
		"is_credit": "cards.is_credit",
		"rate": "cards.pct",
	},
};

function main() {
	var prefs = AnyBalance.getPreferences();
	// Пока ничего кроме карт не поддерживается, ну, оставим, на всякий
    if(!/^(acc|dep|card|cred)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	var result = {success: true};
	
	var html = login(prefs, result);
	
    adapter.processCards = adapter.envelope(processCards);

	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
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
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(info.num, prefs.cardnum))
				return true;
		    
			return false;
		}
		default:
			return false;
	}
}