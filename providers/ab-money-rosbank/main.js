/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'fio' : 'info.fio'
	},
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"till": "cards.till",
		"accnum": "cards.num",
		"accname": "cards.accnum",
		"__tariff": "cards.__name"
    },
	acc: {
		"currency": "accounts.currency",
    	"balance": "accounts.balance",
		"accnum": "accounts.num",
		"accname": "accounts.type",
		"__tariff": "accounts.__name"
    },
	dep: {
		"currency": "deposits.currency",
    	"balance": "deposits.balance",
		"accnum": "deposits.num",
		"accname": "deposits.type",
		"__tariff": "deposits.__name"
    }

};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'cards':
		{
		    if(!prefs.contract)
		    	return true;
			if(prefs.type != 'card')
				return false;
			return endsWith(info.num, prefs.contract);
		}
		case 'accounts':
		{
		    if(!prefs.contract)
		    	return true;
			if(prefs.type != 'acc')
				return false;
			return endsWith(info.num, prefs.contract);
		}
		case 'deposits':
		{
		    if(!prefs.contract)
		    	return true;
			if(prefs.type != 'dep')
				return false;
			return endsWith(info.num, prefs.contract);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|crd|dep)$/i.test(prefs.type || ''))
    	prefs.type = 'card';

    if(prefs.type == 'crd')
    	throw new AnyBalance.Error('Не удаётся получить информацию по кредиту. Сайт изменен?');

    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processDeposits = adapter.envelope(processDeposits);
//    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processInfo = adapter.envelope(processInfo);

	var html = login();

	var result = {success: true};

	adapter.processInfo(result);

	if(prefs.type == 'card'){

		adapter.processCards(result);
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найдена карта с последними цифрами ' + prefs.contract : 'У вас нет ни одной карты');
		result = adapter.convert(result);

	}else if(prefs.type == 'acc'){

		adapter.processAccounts(result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найден счет с последними цифрами ' + prefs.contract : 'У вас нет ни одного счета');
		result = adapter.convert(result);

	}else if(prefs.type == 'dep'){

		adapter.processDeposits(result);
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найден депозит с последними цифрами ' + prefs.contract : 'У вас нет ни одного депозита');
		result = adapter.convert(result);

/*	}else if(prefs.type == 'crd'){

		adapter.processCredits(result);
		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.contract ? 'Не найден кредит с последними цифрами ' + prefs.contract : 'У вас нет ни одного кредита');
		result = adapter.convert(result);
*/
	}

	AnyBalance.setResult(result);
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(/<a[^>]+href="Loans.aspx"/.test(html))
        html = AnyBalance.requestGet(baseurl + 'Loans.aspx');

    var re = new RegExp('(<tr[^>]*id=["\']?par_(?:[\\s\\S](?!<tr))*' + (prefs.contract || 'td') + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит №' + prefs.contract : 'ни одного кредита'));

    var result = {success: true};
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payTill', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payNext', /(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<span[^>]+id="ctl00_FIOLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'Logout.aspx', g_headers2);
    AnyBalance.setResult(result);
    
}
