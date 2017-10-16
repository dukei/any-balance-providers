/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
};

var baseurl = 'https://online.credit-agricole.ua/';

function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'uk', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'login') {
				return prefs.login;
			} else if (name == 'password') {
				return prefs.password;
			} else if (name == 'captcha') {
				var captchaSRC = getParam(html, null, null,  /<input[^>]+captchaHash[^>]+value="([^"]*)/i);
				if(!captchaSRC) {
					AnyBalance.trace(html);
					throw new AnyBalance.Error("Не удалось найти ссылку на капчу.");
				}
				var img = AnyBalance.requestGet(baseurl + 'assets/captcha/' + captchaSRC, addHeaders({
					Referer: baseurl + 'uk/security/logon'
				}));
				return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
			}
			return value;
		});

		html = AnyBalance.requestPost(baseurl + 'uk/security/logon', params, addHeaders({
			Referer: baseurl + 'uk/security/logon'
		}));


	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, [/<div[^>]+buttons-info[^>]*>([\s\S]*?)<\/div>/i, /<div[^>]+pageerror[^>]*>([\s\S]*?)<\/div>/i], replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Недійсний логін чи пароль|Неправильний код з малюнку)/i.test(error));
		
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
	throw new AnyBalance.Error("Обработка счетов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.")
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(baseurl + 'uk/cards/allcards?nc=' + new Date().getTime(), addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': 			baseurl + 'uk'
	}));

	var cards = getJson(html);
	if(!cards.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Карты не найдены.");
		return;
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var id    = cards[i].CardNumber,
			num   = cards[i].CardNumber,
			title = cards[i].CardName;

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(parseBalance(card.Balance || 0) / 100, result, 'cards.balance');
	getParam(parseBalance(card.InterestRate || 0) * 0.1, result, 'cards.pct');
	getParam(card.Currency, result, 'cards.currency');
    getParam(card.CardSubType, result, 'cards.type');
    getParam(card.AgreementNumber, result, 'cards.agreement');
    getParam(card.RelatedAccount, result, 'cards.accnum');
    getParam(card.EmbossedName, result, 'cards.holder');
    getParam(card.AgreementDate, result, 'cards.agreement_date', null, null, parseDateISO);
    getParam(card.ExpirationDate, result, 'cards.till', null, null, parseDateISO);
	result.status = (card.Status == 0) ? 'Активна' : 'Неактивна';

	if(isAvailable('cards.transactions')) {
		processCardTransactions(card, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

	html = AnyBalance.requestGet(baseurl + 'uk/deposits/isc/data?nc=' + new Date().getTime(), addHeaders({
		'X-Requested-With':	'XMLHttpRequest',
		'Referer': 			baseurl + 'uk'
	}));

	var deposits = getJson(html);
	if(!deposits.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Депозиты не найдены.");
		return;
	}

	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];

	//depositType: M ??
	for(var i=0; i < deposits.length; ++i){
		var id    = deposits[i].AccountNumber;
		var num   = deposits[i].Agreement;
		var title = deposits[i].AccountNumber;
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], c);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(deposit, result) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

	getParam(parseBalance(deposit.Amount || 0)/100, result, 'deposits.amount');
	getParam(parseBalance(deposit.Balance || 0)/100, result, 'deposits.balance');
	getParam(parseBalance(deposit.InterestRate || 0)*0.1, result, 'deposits.pct');
	getParam(deposit.Currency, result, 'deposits.currency');
	getParam(deposit.ContractId, result, 'deposits.contract_id');
	getParam(parseDateISO(deposit.FromDate), result, 'deposits.date_start');
	getParam(deposit.Withdrawal, result, 'deposits.withdraw');
	getParam(deposit.Replenishment, result, 'deposits.topup');

	//У депозита не было операций, пока нет возможности их обработать.
   /* if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, result);*/
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.")
}


function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + 'uk/user?nc=' + new Date().getTime(), addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'uk'
	}));

    var info = result.info = {};
    getParam(html, info, 'info.fio', /Повне(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.mphone', /Мобільний телефон(?:[^>]*>){2}([^<]*)/i, replaceHtmlEntities);
    getParam(html, info, 'info.email', /email:ko(?:[^\(]*\()([^\)]*)/i, [replaceHtmlEntities, /'/g, '']);
}
