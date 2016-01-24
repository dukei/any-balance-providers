/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт и счетов Белагропромбанка

Сайт оператора: http://www.belapb.by
Личный кабинет: https://www.ibank.belapb.byz
*/

var g_countersTable = {
	common: {
	},
	card: {
        "balance": "cards.balance",
        "type": "cards.type",
        "status": "cards.status",
        "cardnum": "cards.num",
        "till": "cards.till",
        "accnum": "cards.accnum",
        "fio": "cards.holder",
        "currency": "cards.currency",
        "__tariff": "cards.__name"
	},
	crd: {
        "balance": "credits.balance",
        "type": "credits.type",
        "till": "credits.till",
        "accnum": "credits.num",
        "fio": "credits.fio",
        "currency": "credits.currency",
        "__tariff": "credits.__name"
	},
	dep: {
        "balance": "deposits.balance",
        "type": "deposits.type",
        "till": "deposits.till",
        "accnum": "deposits.num",
        "fio": "info.fio",
        "currency": "deposits.currency",
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
			
			if(endsWith(info.num, prefs.num))
				return true;
		}
		default:
			return false;
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
    if(!/^(card|crd|dep|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
    if(prefs.type == 'acc')
    	prefs.type = 'dep';

    prefs.num = prefs.cardnum;
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login();
	
	var result = {success: true};
	
	adapter.processInfo(html, result);

	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной активной карты!');
		
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
