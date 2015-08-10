/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	card: {
		"total": "total",
		"currency": "currency",
    	"balance": "accounts.cards.balance",
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
		"__tariff": "accounts.cards.num"
    },
	acc: {
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
    },
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
		    if(!prefs.num)
		    	return true;
			if(prefs.what == 'card'){
		        for(var i=0; i<info.cards.length; ++i){
		        	if(endsWith(info.cards[i].num, prefs.num)){
		        		g_found_card_idx = i;
		        		return true;
		        	}
		        }
		    }else if(prefs.what == 'acc'){
		       	if(endsWith(info.__id, prefs.num))
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
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты');
		result = adapter.convert(result);

	}else if(prefs.what == 'acc'){

		adapter.processAccounts(html, result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита');
		result = adapter.convert(result);

	}else if(prefs.what == 'dep'){
		mainDep(prefs.what, g_baseurl);
		return;
	}

	AnyBalance.setResult(result);
}

var g_phrases = {
   karty: {card: 'карты', acc: 'счета', dep: 'договора на вклад'},
   kartu: {card: 'карту', acc: 'счет', dep: 'договор на вклад'},
   karte1: {card: 'первой карте', acc: 'первому счету', dep: 'первому вкладу'},
   karty1: {card: 'одной карты', acc: 'одного счета', dep: 'одного вклада'}
}

function mainDep(what, baseurl){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl + "/priv/deposits");
	
	var num = prefs.num || '';
	// <tr>\s*<td>(?:[^>]*>){4}\s*Договор(?:[^>]*>){1}[^<]+(?:[^>]*>){15,30}\s*</tr>
	var tr = getParam(html, null, null, new RegExp('<tr>\\s*<td>(?:[^>]*>){4}\\s*Договор(?:[^>]*>){1}[^<]+' + num + '(?:[^>]*>){15,30}\\s*</tr>', 'i'));
	if(!tr) {
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
		else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }
	
	var result = {success: true};
	
	getParam(tr, result, 'balance', /([^>]*>){19}/i, myReplaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency','balance'], /([^>]*>){15}/, replaceTagsAndSpaces);
	getParam(tr, result, 'percent', /([^>]*>){17}/, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'accname', /([^>]*>){4}/i, replaceTagsAndSpaces);
	getParam(tr, result, '__tariff', /([^>]*>){4}/i, replaceTagsAndSpaces);
	getParam(tr, result, 'cardnum', /([^>]*>){8}/, replaceTagsAndSpaces);
    getParam(tr, result, 'percent_sum', /([^>]*>){21}/, myReplaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'percent_date', /([^>]*>){23}/, myReplaceTagsAndSpaces, parseDate);
	
/*    
    if(AnyBalance.isAvailable('accnum')){
        var href = $acc.find('a.deposit-link').attr('href');
        html = AnyBalance.requestGet(baseurl + '/' + href.replace(/^[.\/]+/g, ''));
        getParam(html, result, 'accnum', /Счет вклада[\s\S]*?<td[^>]*>\s*(\d+)/i);
    }
*/
    AnyBalance.setResult(result);
}