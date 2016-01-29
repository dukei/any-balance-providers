/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
        "account_balance": "cards.balance",
		"account_blocked_balance": "cards.blocked",
        "gracepay": "cards.gracepay",
        "gracetill": "cards.gracepay_till",
        "currency": "cards.currency",
        "contract": "cards.contract",
        "cardnum": "cards.num",
        "contract_date": "cards.date_start",
        "credit_sum": "cards.limit",
        "till": "cards.till",
        "status": "cards.status",
        "accname": "cards.accnum",
        "__tariff": "cards.__name"
	},
	crd: {
		"credit_balance": "credit_balance",
		"payment_sum": "payment_sum",
		"writeoff_date": "writeoff_date",
        "left": "left",
        "account_balance": "account_balance",
		"account_blocked_balance": "account_blocked_balance",
        "gracepay": "gracepay",
        "gracetill": "gracetill",
        "currency": "currency",
        "contract": "contract",
        "cardnum": "cardnum",
        "contract_date": "contract_date",
        "credit_sum": "credit_sum",
        "till": "till",
        "status": "status",
        "accname": "accname",
        "__tariff": "__tariff"
	},
    acc: {
        "account_balance": "accounts.balance",
        "currency": "accounts.currency",
        "contract_date": "accounts.date_start",
        "status": "accounts.status",
        "cardnum": "accounts.num",
        "accname": "accounts.name",
        "__tariff": "accounts.__name"
    },
	dep: {
        "account_balance": "deposits.balance",
        "currency": "deposits.currency",
        "contract": "deposits.contract",
        "cardnum": "deposits.num",
        "contract_date": "deposits.date_start",
        "till": "deposits.till",
        "accname": "deposits.name",
        "__tariff": "deposits.__name"
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
			
			if(endsWith(info.num, prefs.num))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num))
				return true;
		}
		case 'credits':
		{
			if(prefs.type != 'crd')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num))
				return true;
		}	
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num) || endsWith(info.contract, prefs.contract))
				return true;
		}
		default:
			return false;
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	prefs.num = prefs.contract;
	
    if(!/^(card|crd|dep|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    if(/crd/i.test(prefs.type))
    	throw new AnyBalance.Error('Не удаётся получить информацию по кредиту. Сайт изменен?');
	
    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login(prefs);
	
	var result = {success: true};
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'crd') {
		adapter.processCredits(html, result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}
