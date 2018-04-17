﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
    	"balance": "cards.balance",
    	"currency": "cards.currency",
		"till": "cards.till",
		"blocked": "cards.blocked",
		"num": "cards.num",
		"__tariff": "cards.__name",
		"type": "cards.type",
		"sms": "cards.sms",
		"minpay": "cards.minpay",
		"minpay_till": "cards.minpay_till",
		"limit": "cards.limit",
		"gracepay": "cards.gracepay",
		"gracepay_till": "cards.gracepay_till",
    },
	acc: {
    	"balance": "accounts.balance",
    	"currency": "accounts.currency",
		"num": "accounts.num",
		"__tariff": "accounts.__name",
		"type": "accounts.name",
    },
	crd: {
    	"balance": "credits.balance",
    	"currency": "credits.currency",
		"num": "credits.accnum",
		"__tariff": "credits.__name",
		"type": "credits.name",
		"till": "credits.till",
		"minpay": "credits.minpay",
		"minpay_till": "credits.minpay_till",
//		"limit": "credits.limit",
    },
};

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
			
			if(endsWith(info.num.replace(/\D+/g, ''), prefs.num))
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

function main(){
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1.1', 'TLSv1.2'] 
	});
	
    if(!/^(card|crd|dep|acc)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    if(/(dep)$/i.test(prefs.type))
    	throw new AnyBalance.Error('Не удалось получить информацию по депозиту. Сайт изменен?');

    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
//    adapter.processDeposits = adapter.envelope(processDeposits);

	var html = login();

	var result = {success: true};

	adapter.processInfo(html, result);

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
