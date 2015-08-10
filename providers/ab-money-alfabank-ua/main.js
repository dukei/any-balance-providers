/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
    	"balance": "contracts.balance",
		"limit": "contracts.limit",
		"currency": "contracts.currency",
		"card_num": "contracts.cards.num",
		"acc_num": "contracts.accnum",
		"card_name": "contracts.__name",
		"__tariff": "contracts.cards.num",
    },
    credit: {
    	"balance": "credits.balance",
		"limit": "credits.limit",
		"currency": "credits.currency",
		"__tariff": "credits.accnum",
		"next_payment": "credits.next_payment",
		"next_payment_date": "credits.next_payment_date",
		"period": "credits.next_period",
    },
	dep: {
    	"balance": "deposits.balance",
		"currency": "deposits.currency",
		"pct_sum": "deposits.pct_sum",
		"acc_num": "deposits.accnum",
		"pct": "deposits.pct",
		"__tariff": "deposits.__name",
    }
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'contracts':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.cardnum)
		    	return true;
		    for(var i=0; i<info.cards.length; ++i){
		    	if(endsWith(info.cards[i].num, prefs.cardnum))
		    		return true;
		    }
		    return false;
		}
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.cardnum)
		    	return true;
		    return new RegExp(prefs.cardnum + '$').test(info.accnum);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|dep|credit)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    var adapter = new NAdapter(g_countersTable[prefs.type], shouldProcess);
    adapter.processContracts = adapter.envelope(processContracts);
    adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processCredentials = adapter.envelope(processCredentials);

	var html = login();

	var result = {success: true};

	adapter.processCredentials(html, result);

	if(prefs.type == 'card'){

		adapter.processContracts(result);
		if(!adapter.wasProcessed('contracts'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найдена карта с последними цифрами ' + prefs.cardnum : 'У вас нет ни одной карты');
		result = adapter.convert(result);

	}else if(prefs.type == 'dep'){

		adapter.processDeposits(result);
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден депозит с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного депозита');
		result = adapter.convert(result);

	}else if(prefs.type == 'credit'){
		processCredit(result);
	}

	AnyBalance.setResult(result);
}

function processCredit(result){
    var html = AnyBalance.requestGet(g_baseurl + 'get_home_page_block?block=groupCredit&_=' + new Date().getTime(), g_headers);

    /*var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");*/

    var result = {success: true};
    getParam(html, result, 'balance', /Условия договора(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Счет погашения кредита(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'period', /Срок предоставления(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(html, result, 'next_payment', /Следующий платеж(?:[^>]*>){2,50}\s*<div class="column column-D-H">[^>]*>\s*необходимо([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_payment_date', /Следующий платеж(?:[^>]*>){2,50}\s*<div class="column column-D-H">([^<]+)</i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}

