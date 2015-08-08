/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	accounts: {
    	"total": "total",
		"balance": "accounts.balance",
		"cash": "accounts.own",
		"num": "accounts.num",
		"__tariff": "accounts.__name",
    },
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'accounts':
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

    var adapter = new NAdapter(g_countersTable['accounts'], shouldProcess);
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processAccountBalances = adapter.envelope(processAccountBalances);
    adapter.processAccounts = adapter.envelope(processAccounts);

	var html = login();

	var result = {success: true};

	adapter.processInfo(html, result);

	adapter.processAccountBalances(html, result);
	adapter.processAccounts(html, result);
	if(!adapter.wasProcessed('accounts'))
		throw new AnyBalance.Error(prefs.num ? 'Could not find an account with the last digits ' + prefs.num : 'You do not have any accounts');
	result = adapter.convert(result);


	AnyBalance.setResult(result);
}
