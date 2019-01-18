/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт/счетов/депозитов банка совкомбанк

Сайт оператора: http://sovcombank.ru
Личный кабинет: https://elf.sovcombank.ru/elf/app/
*/

/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'fio': 'info.fio'
	}, 
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"num": "cards.cardnum",
		"__tariff": "cards.__name",
		"name": "cards.type",
		"status": "cards.status",
		"till": "cards.till",
		"type": "cards.__name",
		'holder': 'cards.holder',
		'limit': 'cards.limit',
	},
	crd: {
    	"balance": "credits.balance",
    	"limit": "credits.limit",
		"currency": "credits.currency",
		"__tariff": "credits.__name",
		"num": "credits.accnum",
		"till": "credits.till",
		"type": "credits.__name",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"num": "accounts.cardnum",
		"type": "accounts.__name",
		"__tariff": "accounts.__name",
    },
	dep: {
    	"balance": "deposits.balance",
		"currency": "deposits.currency",
		"__tariff": "deposits.__name",
		"num": "deposits.accnum",
		"till": "deposits.till",
		"type": "deposits.type",
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
			if(info.__name.toLowerCase().indexOf(prefs.num.toLowerCase()) >= 0)
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
			if(info.__name.toLowerCase().indexOf(prefs.num.toLowerCase()) >= 0)
				return true;

			return false;
		}
		case 'credits':
		{
			if(prefs.type != 'crd')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(info.__name.toLowerCase().indexOf(prefs.num.toLowerCase()) >= 0)
				return true;

			return false;
		}	
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.num)
		    	return true;
			
			if(info.__name.toLowerCase().indexOf(prefs.num.toLowerCase()) >= 0)
				return true;

			return false;
		}
		default:
			return false;
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	prefs.num = prefs.cardnum;

	throw new AnyBalance.Error("Провайдер больше не поддерживается. Пожалуйста, воспользуйтесь провайдером 'Банк Восточный (API)'", null, true);
	
    if(!/^(card|crd|dep|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
	var html = login('https://elf.faktura.ru/elf/app/');
		
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
