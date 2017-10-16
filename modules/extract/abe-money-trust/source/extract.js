/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var baseurl = 'https://online.trust.ru/';
var baseurlAPI = baseurl + 'api/v1/';

var currencys = {
	810: 'р',
	840: '$',
}

var states = {
	0: 'Активен',
	1: 'Скрыт'
}

function apiCall(action, params, addOnHeaders) {
	var apiHeaders = addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': '*/*',
		'CSP': 'active',
	});
	
	var html = AnyBalance.requestPost(baseurlAPI + action, params, addOnHeaders ? addHeaders(apiHeaders, addOnHeaders) : apiHeaders);
	
	if(!html) {
		throw new AnyBalance.Error('Не удалось получить ответ от сервера. Ошибка при компановке запроса, проверьте заголовок Authorization!');
	}
	
	var json = getJson(html);
	
	if(json.error) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error);
	}
	
	return json;
}

function getToken() {
	return AnyBalance.getData('token');
}

function doLogin(prefs) {
	var json = apiCall('sessions', {
		'username': prefs.login,
		'password': prefs.password,
	});
	
	var token = json.sessionKey;
	
	if(json.next == 'AUTH_SMS') {
		AnyBalance.trace('Требуется ввод одноразового кода из СМС.');
		
		if(AnyBalance.getLevel() >= 7) {
			var sms = AnyBalance.retrieveCode("Пожалуйста, введите код из смс для входа в интернет-банк.");
			AnyBalance.trace('Смс получено: ' + sms);
		} else {
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите приложение!');
		}
		
		if(!sms)
			throw new AnyBalance.Error('Не удалось получить код из смс!');
		
		json = apiCall('auth2', {smsKey: sms}, {'Authorization': token});
	}
	
	if(!token || json.next != 'MAIN') {
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось войти, проблемы на сайте или сайт изменен!');
	}
	
	__setLoginSuccessful();

	AnyBalance.setData('token', token);
	AnyBalance.saveData();	
	return json;
}
function login(prefs) {
	AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['TLSv1.2']});
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'i', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var token = getToken();
	
	if(!token) {
		AnyBalance.trace('Мы еще не входили в кабинет, самое время, сделать это сейчас.');
		var json = doLogin(prefs);
	} else {
		AnyBalance.trace('Мы уже вошли, повторно входить не будем.');
		
		html = AnyBalance.requestGet(baseurlAPI + 'main', addHeaders({
			'Authorization': token,
			'Referer': baseurl + 'i',
		}));
		
		// Токен протух, надо входить
		if(!html) {
			AnyBalance.trace('Сессия устарела, нужно войти повторно.');
			var json = doLogin(prefs);
		} else {
			var json = getJson(html);
		}
	}
	
	return json;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Профиль
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processProfile(jsonInfo, result) {
	if(!AnyBalance.isAvailable('profile'))
		return;

	var profile = result.profile = {};

	getParam(jsonInfo.profile.address, profile, 'profile.address', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.email, profile, 'profile.email', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.filial, profile, 'profile.filial', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.name, profile, 'profile.name', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.phone, profile, 'profile.phone', null, replaceTagsAndSpaces);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(jsonInfo, result) {
	// Есть разные кабинеты, в которых карты в json или в json.main
	// if(!jsonInfo.main)
		// jsonInfo.main = jsonInfo;
	
	var accounts = jsonInfo.accounts;
	if(!accounts.length) {
		AnyBalance.trace(
			JSON.stringify(jsonInfo)
		);
		AnyBalance.trace("Счета не найдены.");
		return;
	}
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var _id = accounts[i].number;
		var title = accounts[i].number;
		
		var acc = {__id: _id, __name: title};
		
		if(__shouldProcess('accounts', acc)){
			processAccount(accounts[i], acc);
		}
		
		result.accounts.push(acc);
	}
}

function processAccount(account, result) {
	AnyBalance.trace('Обработка счета ' + result.__name);

	getParam(account.rest + '', result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[account.currency], result, ['accounts.currency', 'accounts.balance']);

	getParam(account.number, result, 'accounts.accnum', null, replaceTagsAndSpaces);
	getParam(account.type, result, 'accounts.type', null, replaceTagsAndSpaces);
	getParam(states[account.state], result, 'accounts.status');

	if(AnyBalance.isAvailable('accounts.transactions')) {
		processAccountTransactions(account, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(jsonInfo, result) {
	// Есть разные кабинеты, в которых карты в json или в json.main
	// if(!jsonInfo.main)
		// jsonInfo.main = jsonInfo;
	
	var cards = jsonInfo.cards;
	if(!cards.length) {
		AnyBalance.trace(
			JSON.stringify(jsonInfo)
		);
		AnyBalance.trace("Карты не найдены.");
		return;
	}
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = cards[i].number;
		var title = cards[i].number;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
	AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(card.rest + '', result, 'cards.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[card.currency], result, ['cards.currency', 'cards.balance']);
	
	getParam(card.number, result, 'cards.cardnum', null, replaceTagsAndSpaces);
    getParam(card.type, result, 'cards.type', null, replaceTagsAndSpaces);
	getParam(card.dateExpire, result, 'cards.till', null, replaceTagsAndSpaces, parseDateWord);
    getParam(card.cardHolderName, result, 'cards.fio', null, replaceTagsAndSpaces);
	getParam(states[card.state], result, 'cards.status');

	if(isAvailable('cards.transactions')) {
		processCardTransactions(card, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(jsonInfo, result) {
	// Есть разные кабинеты, в которых карты в json или в json.main
	// if(!jsonInfo.main)
		// jsonInfo.main = jsonInfo;
	
	var deposits = jsonInfo.deposits;
	if(!deposits.length) {
		AnyBalance.trace(
			JSON.stringify(jsonInfo)
		);
		AnyBalance.trace("Депозиты не найдены.");
		return;
	}
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i){
		var _id = deposits[i].number;
		var title = deposits[i].number;
		
		var d = {__id: _id, __name: title};
		
		if(__shouldProcess('deposits', d)){
			processDeposit(deposits[i], d);
		}
		
		result.deposits.push(d);
	}
}

function processDeposit(deposit, result) {
	AnyBalance.trace('Обработка депозита ' + result.__name);

	getParam(deposit.rest + '', result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[deposit.currency], result, ['deposits.currency', 'deposits.balance']);

	getParam(deposit.number, result, 'deposits.accnum', null, replaceTagsAndSpaces);
    getParam(deposit.type, result, 'deposits.type', null, replaceTagsAndSpaces);
	getParam(deposit.closed, result, 'deposits.till', null, replaceTagsAndSpaces, parseDate);
	getParam(states[deposit.state], result, 'deposits.status');
    getParam(deposit.contract, result, 'deposits.contract', null, replaceTagsAndSpaces);
    getParam(deposit.rate + '', result, 'deposits.rate', null, replaceTagsAndSpaces, parseBalance);

	if(isAvailable('deposits.transactions')){
		processDepositTransactions(deposit, result);
	}
}

function processCredits(jsonInfo, result) {
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к обработчикам");
}