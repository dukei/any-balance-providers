/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"fio" : "fio"
	},
	accounts: {
    	"balance": "accounts.balance",
		"__tariff": "accounts.plan",
		"abon": "accounts.abon",
		"licschet": "accounts.licschet",
		"topay": "accounts.topay",
		"status": "accounts.status",
		"login": "accounts.login",
    }
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'accounts':
		{	
			if(!prefs.type)
				return true;

			return info.__name == getName(prefs.type);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable.accounts), shouldProcess);
    adapter.fetchAccounts = adapter.envelope(fetchAccounts);

	var lksid = login();

	var result = {success: true};

	adapter.fetchAccounts(lksid, result);
	if(!adapter.wasProcessed('accounts'))
		throw new AnyBalance.Error(prefs.type ? 'Не найдена услуга типа ' + getName(prefs.type) : 'У вас нет ни одной услуги');
	result = adapter.convert(result);

	AnyBalance.setResult(result);
}
