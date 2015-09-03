/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	"balance": "accounts.balance",
	"balance2": "accounts.balance",
	"balance3": "accounts.balance",

	"megafon_balance": "megafon_balance",
	"megafon_can_pay": "megafon_can_pay",
	"qvc_card": "qvc_card",
	"qvc_exp": "qvc_exp",
	"qvc_last": "qvc_last",
	"messages": "messages",
	"bills": "bills",
	"__tariff": "user_acc",
};

function main(){
	var prefs = AnyBalance.getPreferences();
	
    var adapter = new NAdapter(g_countersTable, shouldProcess,  {shouldProcessMultipleCalls: {accounts: true}});
	
	adapter.processAccounts = adapter.envelope(processAccounts);
	adapter.getAccountInfo = adapter.envelope(getAccountInfo);
	
	var html = login(prefs);
	
	var result = {success: true};
	
	var response = adapter.processAccounts(result);
	adapter.getAccountInfo(response, result);
	
	// Теперь надо переложить из accounts на верхний уровень
	if(result.accounts) {
		for(var i = 0; i<result.accounts.length; i++) {
			var balanceVar = (i >= 1 ? 'balance' + (i + 1) : 'balance');
			
			getParam(result.accounts[i].balance, result, balanceVar);
			getParam(result.accounts[i].currency, result, [(i >= 1 ? 'currency' + (i + 1) : 'currency'), balanceVar]);
		}
		result.accounts = undefined;
	}
	
	if(result.user_acc) {
		result.__tariff = result.user_acc;
		result.user_acc = undefined;
	}
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info) {return true;}


