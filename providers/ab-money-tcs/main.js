/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя систему Интернет-Банк.
*/


var g_countersTable = {
	common: {
	}, 
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardnum": "cards.num",
		"name": "cards.name",
		"__tariff": "cards.name",
		"minpay": "accounts.minpay",
		"minpaytill": "accounts.minpaytill",
		"debt": "accounts.debt",
		"rate": "accounts.pct",
		"till": "cards.till",
		"limit": "accounts.limit",
		"freeaddleft": "accounts.free_add_left",
		"freecashleft": "accounts.free_cash_left",
		"freeaddlimit": "accounts.free_add_limit",
		"freecashlimit": "accounts.free_cash_limit",
		"accnum": "cards.accnum"
	},
	dep: {
    	"balance": "deposits.balance",
		"currency": "deposits.currency",
		"name": "deposits.name",
		"__tariff": "deposits.name",
		"pcts": "deposits.pct_sum",
		"rate": "deposits.pct",
		"till": "deposits.till",
		"accnum": "deposits.num"
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"name": "accounts.name",
		"__tariff": "accounts.name",
		"minpay": "accounts.minpay",
		"minpaytill": "accounts.minpaytill",
		"debt": "accounts.debt",
		"rate": "accounts.pct",
		"limit": "accounts.limit",
		"freeaddleft": "accounts.free_add_left",
		"freecashleft": "accounts.free_cash_left",
		"freeaddlimit": "accounts.free_add_limit",
		"freecashlimit": "accounts.free_cash_limit",
		"accnum": "accounts.num"
    }
};

var g_accountIDForCard;

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|dep|saving)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    if(prefs.type == 'saving')
    	throw new AnyBalance.Error('Не удаётся получить накопительный счет. Сайт изменен?');
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
//    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processDeposits = adapter.envelope(processDeposits);

	login();
	
	var result = {success: true};

//	adapter.processInfo(result);
	
	if(prefs.type == 'card') {
		adapter.processCards(result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');

		g_accountIDForCard = adapter.traverse(result, 'cards.accid');
		adapter.processAccounts(result);
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
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
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type == 'acc'){
		        if(!prefs.num)
		        	return true;
				
				if(endsWith(info.num, prefs.num))
					return true;
		    }else if(prefs.type == 'card'){
		    	return info.__id == g_accountIDForCard;
		    }
		}
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(endsWith(info.num, prefs.num))
				return true;
		}
		default:
			return false;
	}
}
