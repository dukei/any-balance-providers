/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"fio": "profile.fio",
	}, 

    acc: {
		"__tariff": "accounts.__name",
		
		"balance": "accounts.balance",
		"plannedBalance": "accounts.plannedBalance",
		"currency": "accounts.currency",
		"type": "accounts.type",
		"status": "accounts.status",
		"number": "accounts.__name",
		"unreadDocuments": "accounts.unreadDocuments",
		"unreadOperations": "accounts.unreadOperations",
    },
};

function main() {
	var prefs = AnyBalance.getPreferences();
    if(!/^(acc|dep|card|cred)$/i.test(prefs.type || ''))
    	prefs.type = 'acc';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	var result = {success: true};
	
	// Входим
	login(prefs, result);
	
	try {
		adapter.processAccounts = adapter.envelope(processAccounts);
		
		if(prefs.type == 'acc') {
			adapter.processAccounts(result);

			if(!adapter.wasProcessed('accounts'))
				throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
		}
		
		result = adapter.convert(result);
	} finally {
		// Выходим, нужно для отладки, но все же
		logout();
	}
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	switch(counter){
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.__name, prefs.num))
				return true;
		    
			return false;
		}
		default:
			return false;
	}
}