/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"total": "total",
		"currency": "currency",
    	"balance": "accounts.cards.balance",
		"credit_used": "accounts.credit_used",
		"credit_pay_to": "accounts.minpay_till",
		"credit_pay_sum": "accounts.minpay",
		"cardnum": "accounts.cards.num",
		"accnum": "accounts.num",
		"fio": "fio",
		"__tariff": "accounts.cards.num"
    },
/*	acc: {
		"total": "total",
		"currency": "currency",
    	"balance": "accounts.balance",
		"limit": "accounts.limit",
		"accamount": "accounts.balance",
		"credit_used": "accounts.credit_used",
		"credit_pay_to": "accounts.minpay_till",
		"credit_pay_sum": "accounts.minpay",
		"cardnum": "accounts.cards.num",
		"cardname": "accounts.cards.name",
		"accnum": "accounts.num",
		"accname": "accounts.name",
//		"fio": "fio",
		"__tariff": "accounts.__name"
    }, */
};

var g_found_card_idx;

function traverseCard(prop, path){
	return prop ? prop[g_found_card_idx || 0] : prop;
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'accounts':
		{
		    if(!prefs.cardnum)
		    	return true;
			if(prefs.what == 'card'){
		        for(var i=0; i<info.cards.length; ++i){
		        	if(endsWith(info.cards[i].num, prefs.cardnum)){
		        		g_found_card_idx = i;
		        		return true;
		        	}
		        }
		    }else if(prefs.what == 'acc'){
		       	if(endsWith(info.__id, prefs.cardnum))
	        		return true;
		    }
		    return false;
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|dep)$/i.test(prefs.what || ''))
    	prefs.what = 'card';

    var adapter = new NAdapter(g_countersTable[prefs.what], shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.setTraverseCallbacks({'accounts.cards': traverseCard});

	var html = login();

	var result = {success: true};

	adapter.processInfo(html, result);

	if(prefs.what == 'card'){

		adapter.processAccounts(html, result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найдена карта с последними цифрами ' + prefs.cardnum : 'У вас нет ни одной карты');
		result = adapter.convert(result);

	}else if(prefs.what == 'acc'){

		adapter.processAccounts(html, result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден счет с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного депозита');
		result = adapter.convert(result);

	}else {//if(prefs.what == 'dep'){
		throw AnyBalance.Error('Депозиты пока не поддерживаются!')
	}

	AnyBalance.setResult(result);
}
