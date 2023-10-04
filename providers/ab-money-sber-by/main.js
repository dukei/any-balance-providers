/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'fio': 'info.fio'
	}, 
	card: {
		"__forceAvailable": ["cards.accid"],
    	"balance": "cards.balance",
    	"accbalance": "accounts.balance",
		"currency": "cards.currency",
		"cardnum": "cards.num",
		"accnum": "accounts.num",
		"type": "cards.name",
		"__tariff": "cards.__name",
		"pct": "accounts.pct",
		"till": "cards.till",
	},
	crd: {
		"__forceAvailable": ["credits.accid"],
    	"balance": "credits.balance",
    	"cardnum": "credits.num",
    	"accnum": "accounts.num",
		"currency": "credits.currency",
    	"limit": "credits.limit",
		"pct": "credits.pct",
		"type": "credits.name",
		"till": "credits.till",
		"__tariff": "credits.__name",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"__tariff": "accounts.__name",
		"accnum": "accounts.num",
		"type": "accounts.name",
		"pct": "accounts.pct"
    }
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	if(!info || (!info.__id || !info.__name))
		return false;
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.num)
		    	return true;
			
			for(var i=0; i<prefs.num.length; ++i)
				if(endsWith(info.num, prefs.num[i]))
					return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type == 'acc'){
		        if(!prefs.num)
		        	return true;
				
				for(var i=0; i<prefs.num.length; ++i)
					if(endsWith(info.num, prefs.num[i]))
						return true;
			}else if(prefs.type == 'card'){
				return shouldProcess.selectedIds.indexOf(info.__id) >= 0;
			}else{
				return false;
			}
		}
		case 'credits':
		{
			if(prefs.type != 'crd')
				return false;
		    if(!prefs.num)
		    	return true;
			
			for(var i=0; i<prefs.num.length; ++i)
				if(endsWith(info.num, prefs.num[i]))
					return true;
			return false;
		}	
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			for(var i=0; i<prefs.num.length; ++i)
				if(endsWith(info.num, prefs.num[i]))
					return true;
			return false;
		}
		default:
			return false;
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
    if(!/^(card|crd|dep|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    prefs.num = (prefs.cardnum || '').split(/\s*,\s*/g);
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess, {shouldProcessMultipleCalls: true});
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
//    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login(prefs);
	
	var result = {success: true};

	adapter.processInfo(html, result);
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);

		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдены карты с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
		
		var cardsIds = [];
		var selectedIds = shouldProcess.selectedIds = [];
		for(var i=0; i<result.cards.length; ++i){
			var card = result.cards[i];
			if(shouldProcess('cards', card)){
				cardsIds.push(card.__id);
				selectedIds.push(card.accid);
			}
		}

		adapter.processAccounts(html, result);

		adapter.setTraverseCallbacks({
			"cards": function(prop, path){ return adapter.findEntityById(prop, cardsIds[i]) },
			"accounts": function(prop, path){ return adapter.findEntityById(prop, selectedIds[i]) }
		});

		var results = [];
		for(var i=0; i<cardsIds.length; ++i){
			results.push(adapter.convert(result));
		}	

		result = results[0];
		makeAdditionalBalances(result, results, 'cardnum');

	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдены счета с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
		
		adapter.setTraverseCallbacks({
			"accounts": function(prop, path){ return prop[i] }
		});

		var results = [];
		for(var i=0; i<result.accounts.length; ++i){
			if(shouldProcess('accounts', result.accounts[i])){
				results.push(adapter.convert(result));
			}
		}	

		result = results[0];
		makeAdditionalBalances(result, results, 'accnum');
	} else if(prefs.type == 'crd') {
		adapter.processCredits(html, result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдены кредиты с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
		
		adapter.setTraverseCallbacks({
			"credits": function(prop, path){ return prop[i] }
		});

		var results = [];
		for(var i=0; i<result.credits.length; ++i){
			if(shouldProcess('credits', result.credits[i]))
				results.push(adapter.convert(result));
		}	

		result = results[0];
		makeAdditionalBalances(result, results, 'cardnum');
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдены депозиты с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		var results = [];
		for(var i=0; i<result.deposits.length; ++i){
			if(shouldProcess('deposits', result.deposits[i]))
				results.push(adapter.convert(result));
		}	

		result = results[0];
		makeAdditionalBalances(result, results, 'accnum');
	}

	if(result.currency)
		result.currency = CurrencyISO.getCurrencySymbol(result.currency);
	
	AnyBalance.setResult(result);
}

function makeAdditionalBalances(result, results, numname){
	for(var i=0; i<results.length; ++i){
		if(i > 0){
			getParam(results[i].balance, result, 'balance' + i);
			getParam(results[i][numname], result, numname + i);
			if(results[i].currency)
			    getParam(results[i].currency, result, ['currency' + i, 'balance' + i], null, null, CurrencyISO.getCurrencySymbol);
		}
		var balance = results[i]['balance'];
		if(typeof balance == 'undefined')
			balance = '?';
		
		var res = '<b>' + results[i][numname] + ':</b><br/> ' + balance;
		if(results[i]['currency'])
			res += ' ' + results[i]['currency'];

		sumParam(res, result, 'details', null, null, null, create_aggregate_join(',<br/> '));
	}
}
