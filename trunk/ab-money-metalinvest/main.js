/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
 	common: {
 		"fio": "fio"
 	},
	credit: {
    	"balance": "credits.balance",
		"limit": "credits.limit",
		"currency": "credits.currency",
		"accnum": "credits.__id",
		"accname": "credits.__name",
		"__tariff": "credits.__name",
		"min_pay": "credits.min_pay",
		"min_pay_till": "credits.min_pay_till",
		"pct": "credits.pct",
    },
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"accnum": "accounts.num",
		"accname": "accounts.name",
		"__tariff": "accounts.__name",
    },
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.cardnum)
		    	return true;
		    var num = info.__id.split('|')[0];

		    return endsWith(num, prefs.cardnum);
		}
		case 'credits':
		{
			if(prefs.type != 'credit')
				return false;
		    if(!prefs.cardnum)
		    	return true;
		    return endsWith(info.__id, prefs.cardnum);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(acc|credit)$/i.test(prefs.type || ''))
    	prefs.type = 'acc';

    var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processInfo = adapter.envelope(processInfo);

	var jsonInfo = login('https://info.metib.ru:8223/v1/cgi/bsi.dll?');

	var result = {success: true};

	adapter.processInfo(jsonInfo, result);

	if(prefs.type == 'acc'){

    	checkEmpty(!prefs.cardnum || /^\d{4,}$/.test(prefs.cardnum), 'Введите от 4 последних цифр номера счета или не вводите ничего');

		adapter.processAccounts(jsonInfo, result);
		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден счет с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного счета');
		result = adapter.convert(result);

	}else if(prefs.type == 'credit'){

    	checkEmpty(!prefs.cardnum || /^\d{4,}$/.test(prefs.cardnum), 'Введите от 4 последних цифр номера кредитного счета или не вводите ничего');

		adapter.processCredits(jsonInfo, result);
		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден кредит с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного кредита');
		result = adapter.convert(result);

	}

	AnyBalance.setResult(result);
}
