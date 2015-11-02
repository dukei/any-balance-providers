/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'userName': 'profile.name',
		// '': 'profile.phone',
		// '': 'profile.mail',
		// '': 'profile.dateOfBirth',
	},
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardNumber": "cards.cardNumber",
		"till": "cards.till",
		"blocked": "cards.blocked",
		"limit": "cards.limit",
		"grace_pay": "cards.gracepay",
		"grace_till": "cards.gracepay_till",
		"debt": "cards.total_debt",
		"minpay": "cards.minpay",
		"minpay_till": "cards.minpay_till",
		
		"__tariff": "cards.cardNumber",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"total": "accounts.total",		
		"accnum": "accounts.accnum",
		"acctype": "accounts.acctype",
		"blocked": "accounts.blocked",
		
		"__tariff": "accounts.accnum",
    }
};

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processProfile = adapter.envelope(processProfile);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
	
	var result = {success: true};
	
	var prefs = AnyBalance.getPreferences();
	
	var result = {success: true};
	try {
		var html = login(prefs);
		var logout_url = getParam(html, null, null, /<a\s+href="([^"]+)">\s*Выход\s*<\/a>/i, null, html_entity_decode);
		if(!logout_url) 
			AnyBalance.trace('Не удалось найти ссылку на выход, наверное, сайт изменен. Не сможем выйти из кабинета...');
		
		adapter.processProfile(html, result);
		
		if(prefs.type == 'card') {
			adapter.processCards(html, result);
			
			if(!adapter.wasProcessed('cards'))
				throw new AnyBalance.Error(prefs.cardnum ? 'Не найдена карта с последними цифрами ' + prefs.cardnum : 'У вас нет ни одной карты!');
			
			result = adapter.convert(result);
		} else if(prefs.type == 'acc') {
			adapter.processAccounts(html, result);
			
			if(!adapter.wasProcessed('accounts'))
				throw new AnyBalance.Error(prefs.cardnum ? 'Не найден счет с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного счета!');
			
			result = adapter.convert(result);
		}
	} finally {
		if(logout_url){
			AnyBalance.trace('Выходим из кабинета...');
			AnyBalance.requestGet(baseurl + logout_url, g_headers);
		}
	}
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	var num = info.__name;
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(num, prefs.cardnum))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(num, prefs.cardnum))
				return true;
		}
		default:
			return false;
	}
}