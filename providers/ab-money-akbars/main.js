/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'bonuses': 'bonuses',
		'fio': 'info.fio'
	}, 
	accounts: {
    	"balance": ["cards.balance", "accounts.balance"],
    	"debt": ["cards.debt", "accounts.debt"],
		"currency": ["cards.currency","accounts.currency"],
		"card_type": ["cards.name","accounts.name"],
		"__tariff": ["cards.__name","accounts.__name"],
		"card_num": ["cards.num","accounts.num"],
		"card_exp": "cards.till",
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
	
	if(!info || (!info.__id || !info.num))
		return false;
	
	if(!prefs.cardnum)
		return true;
	
	if(endsWith(info.num, prefs.cardnum))
		return true;
	
	return false;
}
