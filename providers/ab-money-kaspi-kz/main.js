/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_countersTable = {
	common: {
		'bonuses': 'info.bonus',
		'wallet': 'info.wallet',
		'fio': 'info.fio'
	},
	card: {
		"balance": "cards.balance", //баланс
		"limit": "cards.limit", //Кредитный лимит
		"debt": "cards.debt", //задолженность
		"currency": "cards.currency",
		"card_num": "cards.num",
		"__tariff": "cards.num",
		"name": "cards.__name",
		"status": "cards.status",
		"till": "cards.till",
		'pay_till': 'cards.pay_till', //оплатить до
	},
	crd: {
		"balance": "credits.balance",
		"next_pay": "credits.next_pay",
		"pay_till": "credits.pay_till",
		"paid": "credits.paid",
		"currency": "credits.currency",
		"period_left": "credits.period_left",
		"__tariff": "credits.num",
	},

	dep: {
		"balance": "deposits.balance",
		"__tariff": "deposits.agreement",
		"currency": "deposits.currency",
		"pct": "deposits.pct",
		"date_start": "deposits.date_start",
		"card_num": "deposits.dvk_num", //номер карты
		"status": "deposits.dvk_status",
		"till": "deposits.dvk_till", //срок действия карты
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

	if(!/^(card|crd|dep)$/i.test(prefs.type || ''))
		prefs.type = 'card';

	var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);

	adapter.processCards    = adapter.envelope(processCards);
	adapter.processCredits  = adapter.envelope(processCredits);
	adapter.processDeposits = adapter.envelope(processDeposits);
	adapter.processInfo 	= adapter.envelope(processInfo);

	var html = login(prefs);

	var result = {success: true};

	adapter.processInfo(html, result);
	if(prefs.type == 'card') {
		adapter.processCards(html, result);

		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');

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
