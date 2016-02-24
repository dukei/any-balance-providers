/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36'
};

var baseurl = 'https://www.touchbank.com';

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/lk/dashboard#/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {

		//Получаем CSRF token
		html = AnyBalance.requestGet(baseurl+'/proxy?pipe=dummyPipe&action=get_csrf_token', addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			'Referer': baseurl+'/lk'
		}));
		var json = getJson(html);
		var csrf_token = json.data ? json.data.token : undefined;
		if(!csrf_token)
			throw new AnyBalance.Error("Не удалось найти токен авторизации. Сайт изменён?");

		html = AnyBalance.requestPost(baseurl + '/j_spring_security_check', {
			j_username: prefs.login,
			j_password: prefs.password,
			captcha_challenge: ''
		}, addHeaders({
			Referer: baseurl + '/lk',
			'Accept': 'application/json, text/plain, */*',
			'X-CSRF-TOKEN': csrf_token,
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			Origin: baseurl
		}));

		json = getJson(html);

	} else {
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!json.success) {
		var error = json.errors[0] ? json.errors[0].message : undefined;
		if (error)
			throw new AnyBalance.Error(error, null, /Вы ввели неверные логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}


	__setLoginSuccessful();
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	html = AnyBalance.requestPost(baseurl + '/proxy?pipe=userDataPipe&action=PRODUCTS', {
		syncOff: true
	}, addHeaders({'Referer': baseurl + '/lk/cards'}));

	var json = getJson(html);
	if(!json.data && !json.data.accounts) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти ни одного счёта.');
		result.cards = [];
		return;
	}

	var accounts = isArray(json.data.accounts) ? json.data.accounts : [json.data.accounts];

	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var id = accounts[i].id;
		var num = accounts[i].number;
		var title = (accounts[i].alias || '') + ' ' + id;
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(accounts[i], c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(account.info, result, 'accounts.type', /([\s\S]*?)\./i);
    getParam(account.balance + '', result, 'accounts.balance', null, null, parseBalanceSilent);
    getParam(account.currency, result, ['accounts.currency' , 'accounts.balance']);
    getParam(account.openDate, result, 'accounts.date_start', null, null, parseDateWord);
    getParam(account.statusLocale, result, 'accounts.status');

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(account, result);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestPost(baseurl + '/proxy?pipe=userDataPipe&action=PRODUCTS', {
		syncOff: true
	}, addHeaders({'Referer': baseurl + '/lk/cards'}));

	var json = getJson(html);
	if(!json.data && !json.data.cards) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти карты.');
		result.cards = [];
		return;
	}

	var cards = isArray(json.data.cards) ? json.data.cards : [json.data.cards];

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];

	for(var i=0; i < cards.length; ++i){
		var id = cards[i].id;
		var num = cards[i].cardNumber;
		var title = cards[i].formattedNumber;

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);

		searchMultiCards(cards[i], result);
	}
}

function processCard(card, result) {

	getParam(card.balance + '', result, 'cards.balance', null, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(card.ownSum + '', result, 'cards.own', null, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(card.borrowedSum + '', result, 'cards.borrowed', null, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(card.limit + '', result, 'cards.limit', null, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(card.currency, result, ['cards.currency', 'cards.balance', 'cards.own', 'cards.borrowed', 'cards.limit'], null, replaceTagsAndSpaces);
	getParam(card.endDate + '', result, 'cards.till', null, replaceTagsAndSpaces, parseDateISO);
	getParam(card.openDate + '', result, 'cards.date_start', null, replaceTagsAndSpaces, parseDateISO);

	getParam(card.number, result, 'cards.accnum', null, replaceTagsAndSpaces);
	getParam(card.info, result, 'cards.agreement', /дог\.\s*([\s\S]+)/i);

	if(isAvailable('cards.transactions')) {
		processCardTransactions(card, result);
	}
}

function searchMultiCards(card, result) {
	AnyBalance.trace("Ищем мультикарты по карте " + card.cardNumber);

	var html = AnyBalance.requestPost(baseurl + '/proxy?pipe=multicardPipe&action=get_multicard_data', {
		'cardId': card.id
	}, addHeaders({
		'Referer': baseurl + '/lk/cards/multicard'
	}));

	var json = getJson(html);
	if(!json.data || !json.data.multiCardList || !json.data.multiCardList.extCard) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти мультикарты!');
		return;
	}

	var multiCards = isArray(json.data.multiCardList.extCard) ? json.data.multiCardList.extCard : [json.data.multiCardList.extCard];
	AnyBalance.trace("Найдено мультикарт: " + multiCards.length);

	for(var i=0; i < multiCards.length; ++i) {

		var multicard = {};

		getParam(multiCards[i].extCardId, multicard, 'cards.id');
		getParam(card.cardNumber, multicard, 'cards.primaryCardNumber');
		getParam(multiCards[i].maskedPAN, multicard, 'cards.num');
		getParam(multiCards[i].extCardName, multicard, 'cards.name');
		getParam(multiCards[i].extCardOptionStatus, multicard, 'cards.optionStatus', null, [/NOTSPECIFIED/i, 'Специальная карта', /FALLBACK/i, 'Резервная карта']);
		getParam(multiCards[i].extCardStatus, multicard, 'cards.status');
		getParam(multiCards[i].extCardMonthExpiry + '.' + multiCards[i].extCardYearExpiry, multicard, 'cards.till', null, null, parseDateSilent);

		result.cards.push(multicard);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

	html = AnyBalance.requestPost(baseurl + '/proxy?pipe=userDataPipe&action=PRODUCTS', {
		syncOff: true
	}, addHeaders({'Referer': baseurl + '/lk/cards'}));

	var json = getJson(html);
	if(!json.data && !json.data.deposits) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти депозиты.');
		result.deposits = [];
		return;
	}

	var deposits = isArray(json.data.deposits) ? json.data.deposits : [json.data.deposits];
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];

	for(var i=0; i < deposits.length; ++i){
		var id = deposits[i].id;
		var num = deposits[i].number;
		var title = getParam(deposits[i].info, null, null, /кл\.([^\d]*\d+)/i, replaceTagsAndSpaces); //сюда вместо formattedNum добавлю счёт учёта депозита

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], c);
		}

		result.deposits.push(c);
	}
}

function processDeposit(deposit, result) {

    getParam(deposit.balance, result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalanceSilent);
    getParam(deposit.limit, result, 'deposits.limit', null, replaceTagsAndSpaces, parseBalanceSilent);
    getParam(deposit.chargesAmountForMonth, result, 'deposits.chargesAmountForMonth', null, replaceTagsAndSpaces, parseBalanceSilent);
    getParam(deposit.currency, result, ['deposits.currency', 'deposits.balance', 'deposits.chargesAmountForMonth', 'deposits.limit']);
    getParam(deposit.interestRate, result, 'deposits.pct');
    getParam(deposit.depositBeginDate, result, 'deposits.date_start', null, null, parseDateSilent);
    getParam(deposit.closeDate, result, 'deposits.till', null, null, parseDateSilent);
    getParam(deposit.info, result, 'deposits.agreement', /дог\.[^\d]*(\d+)/i);
    getParam(deposit.info, result, 'deposits.period', /Депозит[\s\S]*?\./i);
	getParam(deposit.statusLocale, result, 'deposits.status');

	if(isAvailable('deposits.transactions'))
		processDepositTransactions(deposit, result);

}


function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + '/proxy?pipe=userDataPipe&action=PERSON_DATA', g_headers);
	var json = getJson(html);
    var info = result.info = {};

	if(!json.data || !json.data.personData) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось получить персональную информацию. Сайт изменён?");
		return;
	}
	var data = json.data.personData;
    getParam((data.surname + ' ' || '') + (data.firstName + ' ' || '') + (data.patronymic|| ''), info, 'info.fio');
    getParam(data.personId, info, 'info.personID');
	getParam(data.mobilePhone, info, 'info.mphone');

	//Получаем адреса постоянной регистрации и фактического проживания
	for(var i = 0; i < data.addressList.length; i++) {
		var counter_name;
		var adr = data.addressList[i];

		if(/адрес постоянной регистрации/i.test(adr.type)) {
			counter_name = 'raddress';
		} else if (/Адрес фактического проживания/i.test(adr.type)) {
			counter_name = 'faddress'
		}

		if(!counter_name) {
			AnyBalance.trace("Неизвестный тип адреса: " + data.addressList[i].type);
		} else {
			result.info[counter_name] = (adr.postIndex + ', ' || '') + (adr.regionName + ', ' || '') + (adr.city + ', ' || '') + (adr.street + ', ' || '') + (adr.house + ', ' || '') + (adr.apartment || '');
		}
	}

	//Получаем список email'ов. Их может быть несколько.
	if(data.emailList) {
		var emails = [];
		var source = isArray(data.emailList) ? data.emailList : [data.emailList];

		for(var i = 0; i < source.length; i++) {
			emails.push(source[i].email);
		}

		result.info.email = emails.join(', ');
	} else {
		AnyBalance.trace("Не удалось получить список email'ов.");
	}

	//Получаем список документов. docTypeId = 1 - паспорт
	if(data.documentList) {
		var docs = isArray(data.documentList) ? data.documentList : [data.documentList];

		for(var i = 0; i < docs.length; i++) {
			if(docs[i].docTypeId == 1) {
				AnyBalance.trace("Нашли паспорт...");
				result.info.passport = docs[i].serial + docs[i].number;
			} else {
				AnyBalance.trace("Неизвестный тип документа " + JSON.stringify(docs[i]));
			}
		}
	} else {
		AnyBalance.trace("Не удалось получить список документов.");
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error('Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.');
}
