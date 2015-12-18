/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"fio": "profile.USERNAME",
	}, 
    acc: {
		"__tariff": "accounts.__name",
		"accnum": "accounts.__name",
		
		"balance": "accounts.avail",
		"ondeposit": "accounts.balance",
		"currency": "accounts.currency",
		"credit": "accounts.loanUsed",
		"credit_next_payment_till": "accounts.minpay_date",
		"credit_next_payment": "accounts.minpay",
		"rewardPoints": "accounts.rewardPoints",
		"ibanAccuntNo": "accounts.ibanAccuntNo",
		"onhold": "accounts.onhold",
		"ondeposit": "accounts.ondeposit",
		"limit": "accounts.limit",
		"incash": "accounts.incash",
		"balance_lastEx": "accounts.balance_lastEx",
    }
};

function main() {
	var prefs = AnyBalance.getPreferences();
    if(!/^(acc|dep|card|cred)$/i.test(prefs.type || ''))
    	prefs.type = 'acc';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	var result = {success: true};
	
	var html = login(prefs, result);
	
    adapter.processProfile = adapter.envelope(processProfile);
    adapter.processAccounts = adapter.envelope(processAccounts);
	
	adapter.processProfile(html, result);

	if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.accnum ? 'Не найден счет с последними цифрами ' + prefs.accnum : 'У вас нет ни одного счета!');
	}
	
	result = adapter.convert(result);
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info) {
	var prefs = AnyBalance.getPreferences();
	
	switch(counter) {
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.accnum)
		    	return true;
			
			if(endsWith(info.__name, prefs.accnum))
				return true;
		}
		default:
			return false;
	}
}