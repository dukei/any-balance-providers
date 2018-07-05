﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"fio": "info.fio",
		"bonus": "bonus",
	},
	card: {
		"currency": "cards.currency",
    	"balance": "cards.balance",
    	"blocked": "cards.blocked",
		"credit_used": "cards.credit_used",
		"credit_pay_to": "cards.minpay_till",
		"credit_pay_sum": "cards.minpay",
		"cardnum": "cards.num",
		"accnum": "cards.accnum",
		"type": "cards.type",
		"till": "cards.till",
		"credit_used": "cards.fullpay",
		"credit_pay_to": "cards.minpay_till",
		"credit_pay_sum": "cards.minpay",
		"gracepay": "cards.gracepay",
		"status": "cards.status",
		"fio": "cards.fio",
		"airmiles": "cards.airmiles",
		"__tariff": "cards.num",
		"pct": "cards.pct",
    },
	acc: {
		"currency": "accounts.currency",
    	"balance": "accounts.balance",
		"accnum": "accounts.num",
		"type": "accounts.type",
		"status": "accounts.status",
		"__tariff": "accounts.num",
    },
	dep: {
		"currency": "deposits.currency",
    	"balance": "deposits.balance",
		"accnum": "deposits.num",
		"type": "deposits.type",
		"status": "deposits.status",
		"__tariff": "deposits.__name",
		"till": "deposits.till",
    },
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
			if(prefs.type == 'acc'){
		        if(!prefs.num)
		        	return true;
				
				if(endsWith(info.num, prefs.num))
					return true;
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

    prefs.num = prefs.cardnum;
	
    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processBonus = adapter.envelope(processBonus);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processDeposits = adapter.envelope(processDeposits);
	
	login();
	
	var result = {success: true};

	adapter.processInfo(result);
	adapter.processBonus(result);
	
	if(prefs.type == 'card') {
		adapter.processCards(result);

		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');

		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'crd') {
		adapter.processCredits(result);

		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}
