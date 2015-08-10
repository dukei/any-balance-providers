/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"fio": "fio"
	},
	accounts: {
    	"balance": "accounts.balance",
    	"licschet": "accounts.licschet",
    	"pen":   "accounts.pen",
    	"indication":   "accounts.indication",
    	"balance_otop": "accounts.balance_otop",
    	"pen_otop": "accounts.pen_otop",
		"__tariff": "accounts.__name",
		"balance_gor": "accounts.balance_gor",
		"pen_gor": "accounts.pen_gor",
    },
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'accounts':
		{
		    if(!prefs.licschet)
		    	return true;
		    return info.__id == prefs.licschet;
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    var adapter = new NAdapter(joinObjects(g_countersTable.accounts, g_countersTable.common), shouldProcess);
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processAccounts = adapter.envelope(processAccounts);

	var html = login();

	var result = {success: true};

	adapter.processInfo(html, result);

	adapter.processAccounts(html, result);
	if(!adapter.wasProcessed('accounts'))
		throw new AnyBalance.Error(prefs.licschet ? 'Не найден лицевой счет ' + prefs.licschet : 'У вас нет ни одного лицевого счета');

	result = adapter.convert(result);

	AnyBalance.setResult(result);
}