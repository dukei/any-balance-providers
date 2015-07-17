/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	accounts: {
    	"balance": "accounts.balance",
    	"balance_new": "accounts.balance_new",
    	"fio":   "accounts.fio",
    	"traffic":   "accounts.traffic",
    	"agreement":   "accounts.__name",
		"__tariff": "accounts.__name",
    },
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'accounts':
		{
		    if(!prefs.licschet)
		    	return true;
		    return info.__name.toUpperCase().indexOf(prefs.licschet.toUpperCase()) >= 0;
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    var adapter = new NAdapter(joinObjects(g_countersTable.accounts, g_countersTable.common), shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);

	var html = login();

	var result = {success: true};

	adapter.processAccounts(html, result);
	if(!adapter.wasProcessed('accounts'))
		throw new AnyBalance.Error(prefs.licschet ? 'Не найден договор ' + prefs.licschet : 'У вас нет ни одного договора');

	result = adapter.convert(result);

	AnyBalance.setResult(result);
}