/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'bonuses': 'bonuses',
		'fio': 'info.fio'
	}, 
	accounts: {
    	"balance": "cards.available",
    	"balance": "accounts.available",
    	"debt": "cards.total_due",
    	"debt": "accounts.total_due",
		"currency": "cards.currency",
		"currency": "accounts.currency",
		"card_type": "cards.name",
		"card_type": "accounts.name",
		"__tariff": "cards.__name",
		"__tariff": "accounts.__name",
		"card_num": "cards.__name",
		"card_num": "accounts.__name",
		"card_exp": "cards.expire",
	}
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
    var adapter = new NAdapter(joinObjects(g_countersTable.accounts, g_countersTable.common), shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processInfo = adapter.envelope(processInfo);
	
	var json = login(prefs);
	
	var result = {success: true};
	
    adapter.processInfo(json, result);
    adapter.processAccounts(json, result);
    adapter.processCards(json, result);
	
	if(!adapter.wasProcessed('cards') && !adapter.wasProcessed('accounts'))
		throw new AnyBalance.Error(prefs.num ? 'Не найдена карта или счет с последними цифрами ' + prefs.num : 'У вас нет ни одной карты или счета!');
	
	result = adapter.convert(result);
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	if(!info || (!info.__id || !info.__name))
		return false;
	
	if(!prefs.cardnum)
		return true;
	
	if(endsWith(info.__name, prefs.cardnum))
		return true;
	
	return false;
}
