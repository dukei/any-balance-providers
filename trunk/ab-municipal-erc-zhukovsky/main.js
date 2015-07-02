/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"fio": "fio"
	},
	accounts: {
    	"balance": "accounts.balance",
    	"period": "accounts.period",
    	"debt":   "accounts.debt",
    	"paid":   "accounts.paid",
    	"bill":   "accounts.bill",
    	"address": "accounts.address",
    	"licschet": "accounts.__id",
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

	adapter.processAccounts(result);
	if(result.accounts && result.accounts.length == 0)
		throw new AnyBalance.Error(prefs.cardnum ? 'Не найден лицевой счет ' + prefs.licschet : 'У вас нет ни одного лицевого счета');
	adapter.processInfo(result);

	result = adapter.convert(result);

	AnyBalance.setResult(result);
}