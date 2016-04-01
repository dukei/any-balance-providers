/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'fio': 'profile.fio'
	}, 
	card: {
    "balance":    "cards.balance",
		"currency":   "cards.currency",
		"card_num":   "cards.__id",
		"limit":      "cards.limit",
		"till":       "cards.till",
		"status":     "cards.status",
		"holder":     "cards.holderName",
		"__tariff":   "cards.__name",
	},
  acc: {
    "balance":  "accounts.balance",
    "currency": "accounts.currency",
    "accnum":   "accounts.__id",
    "accname":  "accounts.__name",
    "__tariff": "accounts.__id",
  },
  crd: {
    "pay_till":   "credits.minpay_till",
    "pay_sum":    "credits.minpay",
    "pay_debt":   "credits.minpay_main_debt",
    "pay_pct":    "credits.minpay_pct",
    "currency":   "credits.currency",
    "limit":      "credits.balance",
    "__tariff":   "credits.__name",

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
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.__id, prefs.lastdigits))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.__id, prefs.lastdigits))
				return true;
		}
    case 'credits':
    {
      if(prefs.type != 'crd')
        return false;
      if(!prefs.lastdigits)
        return true;

      if(endsWith(info.num, prefs.lastdigits))
        return true;
    }
    default:
			return false;
	}

}

function main() {
	var prefs = AnyBalance.getPreferences();
	
    if(!/^(card|acc|crd)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processCards    = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCredits  = adapter.envelope(processCredits);
    adapter.processProfile  = adapter.envelope(processProfile);

    var html = login(prefs);

    var result = {success: true};

    adapter.processProfile(html, result);
    if(prefs.type == 'card') {
      adapter.processCards(html, result);

      if(!adapter.wasProcessed('cards'))
        throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');

      result = adapter.convert(result);
    } else if(prefs.type == 'acc') {
      adapter.processAccounts(html, result);

      if(!adapter.wasProcessed('accounts'))
        throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');

      result = adapter.convert(result);
    } else if(prefs.type == 'crd') {
      adapter.processCredits(html, result);

      if(!adapter.wasProcessed('credits'))
        throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');

      result = adapter.convert(result);
    }
	
	AnyBalance.setResult(result);
}
