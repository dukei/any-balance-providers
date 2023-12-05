/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json; charset=UTF-8',
	'Connection': 'Keep-Alive',
	'Cache-Control': 'no-cache',
	'User-Agent': 'ozonbankfinance_android_prod',
	'x-o3-language': 'ru',
	'x-o3-app-name': 'ozonbankfinance_android',
	'x-o3-app-version': '16.8.4(16008004)',
};

var g_bankHeaders = {
    "Connection": "keep-alive",
    "accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 8.0.0; AUM-L29 Build/HONORAUM-L29; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.126 Mobile Safari/537.36",
    "ob-client-version": "9aa3c20",
    "X-Requested-With": "ru.ozon.fintech.finance",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
 };

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function callBankApi(verb, params){
	var method = 'GET', params_str = '', headers = g_bankHeaders;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
		headers['Content-Type'] = 'application/json';
		if(/authorize|lk\/__data/i.test(verb)){
			headers['Referer'] = 'https://finance.ozon.ru/signin';
		}else{
			headers['Referer'] = 'https://finance.ozon.ru/m/lk/main';
		}
	}else{
		delete headers['Content-Type'];
		headers['Referer'] = 'https://finance.ozon.ru/m/lk/main';
	}
	
	AnyBalance.trace('Запрос: ' + 'https://finance.ozon.ru/' + verb);
	var html = AnyBalance.requestPost('https://finance.ozon.ru/' + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	if(!/clientIdentificationLevels|lk\/__data/i.test(verb)) // Личные данные не выводим
	    AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(AnyBalance.getLastStatusCode() != 200){
		var error = json.message || (json || []).map(function(e) { return e.message }).join('\n');
		if(error)
			throw new AnyBalance.Error(error, null, /код|не найден/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginBankPure(){
	var prefs = AnyBalance.getPreferences(), json;
	
	json = callBankApi('api/authorize.json' , {"pincode": prefs.pin});
	
	if(!json.authToken){
    	throw new AnyBalance.Error('Не удалось войти в Ozon Банк. Сайт изменен?');
    }

    AnyBalance.setData('authTokenBank' + prefs.login, json.authToken);
	AnyBalance.setData('refreshTokenBank' + prefs.login, json.refreshToken);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}

function loginBankAuthToken(){ // Проверяем авторизацию в Ozon Банк
	try{
		callBankApi('api/v2/clientIdentificationLevels', {});
		AnyBalance.trace('Удалось войти в предыдущей сессии');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти в предыдущей сессии: ' + e.message);
		return false;
	}
}

function loginBankToken(){
	var prefs = AnyBalance.getPreferences();

	if(!AnyBalance.getData('authTokenBank' + prefs.login)){
		AnyBalance.trace('Сессия не сохранена');
		return false;
	}

	if(loginBankAuthToken())
		return true;
}

function loginBank(){
	if(!loginBankToken()){
		loginBankPure();
	}
}

function main() {
	var prefs = AnyBalance.getPreferences(), json;
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/@|^\d{10}$/.test(prefs.login), 'Введите e-mail или телефон (10 цифр без пробелов и разделителей)!');

	AnyBalance.restoreCookies();
	
	login();
	
	loginBank();

	var result = {success: true};
	
	switch(prefs.source){
	case 'card':
        fetchCard(prefs, result);
		break;
    case 'account':
        fetchAccount(prefs, result);
		break;
	case 'deposit':
        fetchDeposit(prefs, result);
		break;
	case 'credit':
        fetchCredit(prefs, result);
		break;
	case 'auto':
    default:
        fetchCard(prefs, result);
		break;
	}
	
	getOverlimitBalance(prefs, result);
	
	getSpendings(prefs, result);
	
	getLoyaltyInfo(prefs, result);
	
	getUnreadMessagesCount(prefs, result);
	
	getProfileInfo(prefs, result);
		
	AnyBalance.setResult(result);
}

function fetchCard(prefs, result){
	var prefs = AnyBalance.getPreferences(), json;
	
	json = callBankApi('api/v2/cards_list', {});
	
	AnyBalance.trace('Найдено Ozon Карт: ' + json.cards.length);
	if(json.cards.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной Ozon Карты');
    
	var currCard;
    
	for(var i=0; i<json.cards.length; ++i){
		var card = json.cards[i];
		AnyBalance.trace('Найден карта ' + card.maskedPan + ' (' + card.product + ')');
	    if(!currCard && (!prefs.num || endsWith(card.maskedPan, prefs.num))){
	    	AnyBalance.trace('Выбрана карта ' + card.maskedPan + ' (' + card.product + ')');
	    	currCard = card;
	    }
	}

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	var cardId = currCard.cardId;
	
	getParam(currCard.maskedPan && currCard.maskedPan.replace(/\D/g, '*').replace(/(.{4})(.{4})(.{4})(.{4})$/, '$1 $2 $3 $4'), result, '__tariff');
	getParam(currCard.maskedPan && currCard.maskedPan.replace(/\D/g, '*').replace(/(.{4})(.{4})(.{4})(.{4})$/, '$1 $2 $3 $4'), result, 'card_num');
    getParam(getCardType(currCard.product)||currCard.product, result, 'card_type');
	getParam(getCardSystem(currCard.product)||currCard.product, result, 'card_sys');
	getParam(g_cardStatus[currCard.status]||currCard.status, result, 'card_state');
	
	json = callBankApi('api/v2/accounts', {}); // Основной счет, карты привязаны к нему, баланс общий с картами
	
	getParam(json.mainAccount.accountNumber, result, 'acc_num');
	getParam((json.mainAccount.balance)/100, result, 'balance', null, null, parseBalance);
	getParam(g_accType['mainAccount']||'mainAccount', result, 'acc_type');
    getParam(g_accStatus[json.mainAccount.status]||json.mainAccount.status, result, 'acc_state');
    
	getPaymentPeriod(prefs, result);
	
	getPremiumStatus(prefs, result);
	
	var params = {"cursors": {"next": null, "prev": null}, "perPage": 3};
	getClientOperations(prefs, result, params);
}

function getPaymentPeriod(prefs, result){
	if(!AnyBalance.isAvailable('payment_period'))
		return;
	
	var dt = new Date();
	var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};
	getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'payment_period');
}

function getPremiumStatus(prefs, result){
	if(!AnyBalance.isAvailable('premium_state', 'bonus_premium'))
		return;
	
	var json = callBankApi('api/v2/premiumUser', {});
		
	var premStatus = {true: 'Активна', false: 'Не активна'};
	getParam(premStatus[json.isPremium]||json.isPremium, result, 'premium_state');
	getParam((json.balance)/100, result, 'bonus_premium', null, null, parseBalance);
}
	
function getOverlimitBalance(prefs, result){
	if(!AnyBalance.isAvailable('overlimit'))
		return;
	
	var json = callBankApi('api/v2/overlimitBalance', {});
	
	getParam((json.overlimitBalance)/100, result, 'overlimit', null, null, parseBalance);
}
	
function getSpendings(prefs, result){
	if(!AnyBalance.isAvailable('month_spend', 'month_receipt'))
		return;
	
	var dt = new Date();
	var dts = new Date(dt.getFullYear(), dt.getMonth()+1, 0);
	var dateFrom = dts.getFullYear() + '-' + n2(dts.getMonth()+1) + '-' + '01';
	var dateTo = dts.getFullYear() + '-' + n2(dts.getMonth()+1) + '-' + n2(dts.getDate());
	
	var json = callBankApi('api/v2/groupCategories', {"dateFrom": dateFrom, "dateTo": dateTo, "effect": "EFFECT_UNKNOWN"});
	
	if(json.categories && json.categories.length > 0){
		AnyBalance.trace('Найдено групп расходов: ' + json.categories.length);
		for(var i=0; i<json.categories.length; ++i){
	        var category = json.categories[i];
			
			if(category.name == 'Траты'){
				getParam((category.amount)/100, result, 'month_spend', null, null, parseBalance);
			}else if(category.name == 'Поступления'){
				getParam((category.amount)/100, result, 'month_receipt', null, null, parseBalance);
			}else{
				AnyBalance.trace('Неизвестная группа расходов: ' + category.name);
			}
		}
	}else{
		AnyBalance.trace('Не удалось найти информацию по расходам');
	}
}
	
function getClientOperations(prefs, result, params){
	if(!AnyBalance.isAvailable(['last_oper_date', 'last_oper_sum', 'last_oper_type', 'last_oper_state', 'last_oper_desc']))
		return;
	
	var json = callBankApi('api/v2/clientOperations', params);
	
	if(json.items && json.items.length > 0){
		AnyBalance.trace('Найдено операций: ' + json.items.length);
		for(var i=0; i<json.items.length; ++i){
	        var item = json.items[i];
			
	        getParam(item.time, result, 'last_oper_date', null, null, parseDateISO);
			getParam(g_operDir[item.direction] + (item.accountAmount)/100, result, 'last_oper_sum', null, null, parseBalance);
			getParam(item.categoryGroupName, result, 'last_oper_type');
			getParam(item.merchantName, result, 'last_oper_desc');
			getParam(g_operStatus[item.status]||item.status, result, 'last_oper_state');
			
			break;
		}
	}else{
		AnyBalance.trace('Не удалось найти информацию по операциям');
	}
}

function getLoyaltyInfo(prefs, result){
	if(!AnyBalance.isAvailable(['cashbackTotal', 'cashback', 'cashback_soon', 'bonus_salers', 'bonus_salers_burn', 'increased_cashback']))
		return;
	
	var json = callBankApi('api/v2/loyalty_info', {});
	
	getParam((json.totalCashbackCents)/100, result, 'cashbackTotal', null, null, parseBalance);
	getParam((json.cashback.amount)/100, result, 'cashback', null, null, parseBalance);
	getParam(json.cashback.date, result, 'cashback_soon', null, null, parseDateISO);
	getParam((json.sellerBonus.amount)/100, result, 'bonus_salers', null, null, parseBalance);
	getParam((json.sellerBonus.burnSoon)/100, result, 'bonus_salers_burn', null, null, parseBalance);
	
	if(json.categories && json.categories.length > 0){
		AnyBalance.trace('Найдено категорий: ' + json.categories.length);
		for(var i=0; i<json.categories.length; ++i){
	        var category = json.categories[i];
			
//			sumParam(category.title + ': ' + category.percent + '% (до ' + category.validTo.replace(/(\d{4})-(\d{2})-(\d{2})T(.*)/, '$3.$2.$1')
//			+ ')', result, 'increased_cashback', null, null, null, create_aggregate_join(',<br> '));

			if(category.isSelected === true){
			    sumParam(category.title + ': ' + category.percent + '%', result, 'increased_cashback', null, null, null, create_aggregate_join(',<br> '));
			}
		}
	}else{
		AnyBalance.trace('Не удалось найти информацию по категориям');
		result.increased_cashback = 'Нет данных';
	}
}
	
function getUnreadMessagesCount(prefs, result){
	if(!AnyBalance.isAvailable('notifications'))
		return;
	
	var json = callBankApi('api/v2/supportChat_unreadMessagesCount', {});
	
	getParam(json.count, result, 'notifications', null, null, parseBalance);
}
	
function getProfileInfo(prefs, result){
	if(AnyBalance.isAvailable('fio')){
	    var json = callBankApi('api/v2/clientIdentificationLevels', {});
	    
	    var person = {};
	    var info = json.levels && json.levels.FULL && json.levels.FULL.document;
	    if(info){
		    sumParam(info.firstName, person, '__n', null, null, null, create_aggregate_join(' '));
//		    sumParam(info.patronymic, person, '__n', null, null, null, create_aggregate_join(' '));
	        sumParam(info.lastName, person, '__n', null, null, null, create_aggregate_join(' '));
	        getParam(person.__n, result, 'fio');
	    }
	}
	
	if(AnyBalance.isAvailable('email', 'phone')){
		var html = AnyBalance.requestGet('https://finance.ozon.ru/lk/profile', g_bankHeaders);
		
		getParam(html, result, 'email', /<div[^>]+testid="email-value">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'phone', /<div[^>]+testid="phone-value">([\s\S]*?)<\/div>/i, replaceNumber);
	}
}

function fetchAccount(prefs, result){
	var prefs = AnyBalance.getPreferences(), json;
	
	json = callBankApi('api/v2/savingsAccount_list', {});
	
	AnyBalance.trace('Найдено накопительных счетов: ' + json.savingsAccounts.length);
	if(json.savingsAccounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного накопительного счета');
    
	var currAcc;
    
	for(var i=0; i<json.savingsAccounts.length; ++i){
		var account = json.savingsAccounts[i];
		AnyBalance.trace('Найден счет ' + account.id + ' (' + account.name + ')');
	    if(!currAcc && (!prefs.num || endsWith(account.id, prefs.num))){
	    	AnyBalance.trace('Выбран счет ' + account.id + ' (' + account.name + ')');
	    	currAcc = account;
	    }
	}

	if(!currAcc)
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
	
	var accountId = currAcc.id;
	
	getParam((currAcc.balance)/100, result, 'balance', null, null, parseBalance);
	getParam(currAcc.id, result, '__tariff');
	getParam(currAcc.id, result, 'acc_num');
    getParam(g_accType['savingAccount']||'savingAccount', result, 'acc_type');
    
    if(currAcc.paymentDate || currAcc.payoutDate){
		var accStatus = 'OPENED';
	}else{
		var accStatus = 'CLOSED';
	}
	
	getParam(g_accStatus[accStatus]||accStatus, result, 'acc_state');
    getParam(currAcc.openDate.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1'), result, 'acc_open_date', null, null, parseDate);
	getParam(((currAcc.predictionInfo && currAcc.predictionInfo.payoutAmount) || currAcc.payoutAmount)/100, result, 'acc_payment_sum', null, null, parseBalance);
	getParam((currAcc.paymentDate || currAcc.payoutDate).replace(/(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1'), result, 'acc_payment_date', null, null, parseDate);
//	var periodFrom = currAcc.predictionInfo.intervalFrom.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1');
//	var periodTo = currAcc.predictionInfo.intervalTo.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1');
	getParam(currAcc.savingPercent, result, 'acc_percent', null, null, parseBalance);
	
	getPaymentPeriod(prefs, result);
	
	getPremiumStatus(prefs, result);
	
	var params = {"cursors": {"next": null, "prev": null}, "perPage": 30, "filter": {"accountNumbers": [accountId], "productNotIn": null}};
	getClientOperations(prefs, result, params);
}

function getCardType(str){
    var val;
	if(/REAL|PLASTIC/i.test(str)){
		val = 'Пластиковая';
	}else if(/VIRTUAL/i.test(str)){
		val = 'Виртуальная';
	}
	return val;
}

function getCardSystem(str){
    var val;
	if(/MIR/i.test(str)){
		val = 'МИР';
	}else if(/VISA|VS/i.test(str)){
		val = 'VISA';
	}else if(/MASTERCARD|MC/i.test(str)){
		val = 'MasterCard';
	}
	return val;
}

var g_accType = {
	'mainAccount': 'Рублевый счет',
	'savingAccount': 'Накопительный счет',
//	CLOSED: 'Закрыт',
//  ACTIVE: 'Активен',
//	INACTIVE: 'Не активен',
//	BLOCKED: 'Заблокирован',
//	ARRESTED: 'Арестован'
};

var g_accStatus = {
	OPENED: 'Активен',
	CLOSED: 'Закрыт',
    ACTIVE: 'Активен',
	INACTIVE: 'Не активен',
	BLOCKED: 'Заблокирован',
	ARRESTED: 'Арестован',
	undefined: ''
};

var g_cardStatus = {
    ACTIVE: 'Активна',
	INACTIVE: 'Не активна',
	WAITING: 'Ожидается',
	BLOCKED: 'Заблокирована',
	ARRESTED: 'Арестована'
};

var g_operStatus = {
	success: 'Выполнена',
	waiting: 'В ожидании',
	processing: 'В обработке',
    cancelled: 'Отменена',
	failed: 'Отклонена'
};

var g_operDir = {
    incoming: '+',
	outgoing: '-',
	undefined: ''
};
