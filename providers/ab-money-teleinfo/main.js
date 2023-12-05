/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_currency = {
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: 'Ұ',
	CHF: '₣',
	CNY: '¥',
	undefined: ''
};

var g_statusAcc = {
	'Active': 'Активен',
	'Inactive': 'Не активен',
	'Blocked': 'Заблокирован',
	'Arrested': 'Арестован',
	'Opened': 'Действующий',
	'Closed': 'Закрыт',
	'': 'Неизвестен'
};

var g_statusCard = {
	'Active': 'Активна',
	'Inactive': 'Не активна',
	'Blocked': 'Заблокирована',
	'Arrested': 'Арестована',
	'Opened': 'Действующая',
	'Closed': 'Закрыта',
	'': 'Неизвестен'
};

var g_type = {
	CREDIT_CARD: 'Кредитная карта',
	DEBET_CARD: 'Дебетовая карта',
	MASTER_ACCOUNT: 'Мастер-счет',
	PIGGY_BANK: 'Накопительный счет',
	INVESTMENT_ACCOUNT: 'Инвестиционное соглашение',
	undefined: ''
};

var g_countersTable = {
	common: {
		"bonuses": "bonuses",
		"phone": "phone",
		"fio": "fio",
		"holder": "holder",
		"lastoperdate": "lastoperdate",
		"lastopersum": "lastopersum",
		"lastopername": "lastopername"
    },
	card: {
		"currency": ["cards.currency", "accounts.currency"],
    	"balance": ["cards.balance", "accounts.balance"],
		"minpay": "cards.minpay",
		"minpay_till": "cards.minpay_till",
		"gracepay": "cards.gracepay",
		"gracepay_till": "cards.gracepay_till",
    	"blocked": "cards.blocked",
		"own": "cards.own",
		"limit": "cards.limit",
		"till": ["cards.till", "accounts.till"],
		"pastdue": "cards.pastdue",
		"date_start": "cards.date_start",
		"ps": "cards.ps",
		"pct": "cards.pct",
		"cardname": ["cards.name", "accounts.name"],
		"type": ["cards.type", "accounts.type"],
		"cardnum": "cards.num",
		"accnum": "accounts.num",
		"status": "card.status",
		"holder": "cards.holder",
		"__tariff": ["cards.__name", "accounts.name"]
    },
    crd: {
		"currency": "credits.currency",
    	"balance": "credits.balance",
		"minpay": "credits.minpay",
		"minpay_till": "credits.minpay_till",
		"gracepay": "credits.gracepay",
		"gracepay_till": "credits.gracepay_till",
		"limit": "credits.limit",
		"credit_till": "credits.till",
		"pastdue": "credits.pastdue",
		"pct": "credits.pct",
		"cardname": "credits.__name",
		"cardnum": "credits.num",
		"accnum": "credits.accnum",
		"__tariff": "credits.__name"
    },
    dep: {
		"currency": "deposits.currency",
    	"balance": "deposits.balance",
		"accnum": "deposits.num",
		"type": "deposits.type",
		"till": "deposits.date_end",
		"deposit_till": "deposits.till",
		"saving_sum": "deposits.sum",
		"month_profit": "deposits.profit",
		"pct": "deposits.pct",
		"own": "deposits.own",
		"__tariff": "deposits.__name"
    }
};

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();

	switch(counter){
		case 'cards':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'card')
				return false;
			return endsWith(info.num, prefs.card);
		}
		case 'accounts':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'card')
				return false;
			return endsWith(info.num, prefs.card);
		}
		case 'deposits':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'dep')
				return false;
			return endsWith(info.num, prefs.card);
		}
		case 'credits':
		{
		    if(!prefs.card)
		    	return true;
			if(prefs.type != 'crd')
				return false;
			return endsWith(info.num, prefs.card);
		}
		default:
			return false;
	}
}

function main(){
	var prefs = AnyBalance.getPreferences();

    if(prefs.source == 'site'){
		AnyBalance.trace('В настройках выбрано обновление с официального сайта');
		mainWeb();
		return;
    }else{
		AnyBalance.trace('В настройках выбрано обновление из мобильного приложения');
		throw new AnyBalance.Error('Обновление из мобильного приложения в настоящее время недоступно. Пожалуйста, выберите Официальный сайт в качестве способа входа в настройках провайдера');
	}

	AnyBalance.trace('В настройках выбрано обновление из мобильного приложения');

	if(!AnyBalance.getCapabilities){
		AnyBalance.trace('Бинарные запросы не поддерживаются. Пока будем обновлять из веба...');
		mainWeb();
		return;
	}

    if(!/^(card|acc|dep|crd)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
    
	var adapter = new NAdapter(joinObjects(g_countersTable.common, g_countersTable[prefs.type]), shouldProcess);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processDeposits = adapter.envelope(processDeposits);
    adapter.processCredits = adapter.envelope(processCredits);
    adapter.processInfo = adapter.envelope(processInfo);

	login();

	var result = {success: true};

	//adapter.processInfo(html, result);

	if(prefs.type == 'card'){

		adapter.processCards(result);
		if(!adapter.wasProcessed('cards')){
			result.cards = [];
			adapter.processAccounts(result);
			if(!adapter.wasProcessed('accounts')) {
				throw new AnyBalance.Error(prefs.card ? 'Не найдены ни карта, ни счет с последними цифрами ' + prefs.card : 'У вас нет ни одной карты или счета');
			}
		}
		result = adapter.convert(result);

	}else if(prefs.type == 'acc'){
		adapter.processCards(result);
		if(!adapter.wasProcessed('cards')){
			result.cards = [];
			adapter.processAccounts(result);
			if(!adapter.wasProcessed('accounts')) {
				throw new AnyBalance.Error(prefs.card ? 'Не найдены ни карта, ни счет с последними цифрами ' + prefs.card : 'У вас нет ни одной карты или счета');
			}
		}
		result = adapter.convert(result);

	}else if(prefs.type == 'dep'){
		throw new AnyBalance.Error('Депозиты временно не поддерживаются. Пожалуйста, обратитесь к разработчикам.');

		adapter.processDeposits(result);
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.card ? 'Не найден депозит с последними цифрами ' + prefs.card : 'У вас нет ни одного депозита');
		result = adapter.convert(result);

	}else if(prefs.type == 'crd'){
		adapter.processCredits(result);
		if(!adapter.wasProcessed('credits'))
			throw new AnyBalance.Error(prefs.card ? 'Не найден кредит с последними цифрами ' + prefs.card : 'У вас нет ни одного кредита');
		result = adapter.convert(result);

	}

	AnyBalance.setResult(result);
}
