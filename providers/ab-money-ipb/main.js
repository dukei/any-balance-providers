var g_countersTable = {
	common: {
		'fio': 'info.fio'
	},
	card: {
		"balance": "cards.balance",
		"currency": "cards.currency",
		"cardnum": "cards.num",
		"__tariff": "cards.__id",
		"status": "cards.status",
		"till": "cards.till",
		'limit': 'cards.limit',
	},
	dep: {
		"balance": "deposits.balance",
		"currency": "deposits.currency",
		"pct": "deposits.pct",
		"accnum": "deposits.num",
		"__tariff": "deposits.__id",
		"till": "deposits.till",
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

	if(!/^(card|dep)$/i.test(prefs.type || ''))
		prefs.type = 'card';

	var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);

	adapter.processCards = adapter.envelope(processCards);
	adapter.processDeposits = adapter.envelope(processDeposits);

	var html = login(prefs);

	var result = {success: true};

	if(prefs.type == 'card') {
		adapter.processCards(html, result);

		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');

		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits(html, result);

		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');

		result = adapter.convert(result);
	}

	AnyBalance.setResult(result);
}