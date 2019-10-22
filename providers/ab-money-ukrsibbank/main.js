/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"__forceAvailable": ['cards.accnum'],
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"overdraft": "cards.overdraft",
		"accnum": "cards.accnum",
		"num": "cards.num",
		"accname": "cards.accname",
		"holder": "cards.holder",
		"till": "cards.till",
		"__tariff": "cards.__name",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"overdraft": "accounts.overdraft",
		"accnum": "accounts.num",
		"accname": "accounts.name",
		"pct": "accounts.pct",
		"overdraft_pct": "accounts.overdraft_pct",
		"overdraft_till": "accounts.overdraft_till",
		"overdraft_due_pct": "accounts.overdraft_due_pct",
		"__tariff": "accounts.__name",
    }
};

var g_accountNumberForCard;

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'acc';

    var html = login();
    var logoutLink = getParam(html, /<a[^>]+href="(?:\.\/)?([^"]*)[^>]+actionLogout/i, replaceHtmlEntities);

	try{
        var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
		
        adapter.processInfo = adapter.envelope(processInfo);
        adapter.processCards = adapter.envelope(processCards);
        adapter.processAccounts = adapter.envelope(processAccounts);
		
		var result = {success: true};
		
		adapter.processInfo(html, result);
		
		if(prefs.type == 'card') {
			adapter.processCards(html, result);
			
			if(!adapter.wasProcessed('cards'))
				throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');
	    
			result = adapter.convert(result);
		} else if(prefs.type == 'acc') {
			adapter.processAccounts(html, result);
	    
			if(!adapter.wasProcessed('accounts'))
				throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');
			
			result = adapter.convert(result);
		}
	}finally{
		var url = joinUrl(g_baseurl, logoutLink);	
		AnyBalance.trace('Logging out: ' + url);
		AnyBalance.requestGet(url, addHeaders({Referer: g_baseurl}));
	}
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num.replace(/\s+/g, ''), prefs.lastdigits))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.lastdigits)
		    	return true;

			if(endsWith(info.num.replace(/\s+/g, ''), prefs.lastdigits))
				return true;

		    return false;
		}
		default:
			return false;
	}
}
