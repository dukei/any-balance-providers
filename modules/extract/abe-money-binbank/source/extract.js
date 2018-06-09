/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://i.binbank.ru/';
var baseurlAPI = baseurl + 'api/v1/';

var g_headers = {
	Connection: 'keep-alive',
	'Cache-Control': 'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
};

var g_api_headers = {
	Connection: 'keep-alive',
	Accept: 'application/json, text/plain, */*',
	'X-Application-Code': 'INTERNET',
	Referer: baseurl + 'login',
};

function apiCall(action, params, addOnHeaders) {
	var apiHeaders = addHeaders(g_api_headers);
	var method = 'GET';
	if(params){
		method = 'POST';
		apiHeaders = addHeaders({'Content-Type': 'application/json;charset=UTF-8'}, apiHeaders);
	}
	if(addOnHeaders)
		apiHeaders = addHeaders(addOnHeaders, apiHeaders);
	
	var html = AnyBalance.requestPost(joinUrl(baseurlAPI, action), params ? JSON.stringify(params) : "", apiHeaders, {HTTP_METHOD: method});
	
	if(!html) {
		throw new AnyBalance.Error('Не удалось получить ответ от сервера. Ошибка при компоновке запроса, проверьте заголовок Authorization!');
	}
	
	var json = getJson(html);

	if(json.code === 'required_confirmation')
		return json;
	
	if(json.code) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.message, {code: json.code, fatal: json.code === 'invalid_login'});
	}
	
	return json;
}

function isLoggedIn(){
	try{
		apiCall('client');
		return true;
	}catch(e){
		if(e.code === 'unauthorized')
			return false;
		throw e;
	}
}

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['TLSv1.1', 'TLSv1.2']});
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(!isLoggedIn()){
	
		var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
		
		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}

		var json = apiCall('auth/login', {
			"login": prefs.login,
			"password": prefs.password,
			"channel": "internet",
			"gsm":true,
			"device_id":"test"
		}); 
		
		if(!json.permissions){
			if(json.code != 'required_confirmation'){
				AnyBalance.trace(JSON.stringify(json));
				throw new AnyBalance.Error('Не удалось войти. Сайт изменен?');
			}

			var code = AnyBalance.retrieveCode('Пожалуйста, введите код для входа в интернет банк, который пришел Вам в СМС. Если Вы не желаете получать запрос на СМС каждый раз, зайдите в интернет банк через браузер и отключите посылку СМС при входе в Настройках Профиля', null, {inputType: 'number', time: 120000});

			var json = apiCall('auth/login', {
				"login": prefs.login,
				"password": prefs.password,
				"channel": "internet",
				"gsm":true,
				"device_id":"test"
			}, {
				'X-Confirmation-Code': code,
				'X-Confirmation-Type': 'sms',
				'X-Validation-Token': json.validation_token,
			});
		}
		
		if(!json.permissions){
			AnyBalance.trace(JSON.stringify(json));
			throw new AnyBalance.Error('Не удалось войти... Сайт изменен?');
		}

		__setLoginSuccessful();

	}else{
		AnyBalance.trace('Используем существующую сессию');
	}
	
	return json;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Профиль
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processInfo(result) {
	if(!AnyBalance.isAvailable('info'))
		return;

	var json = apiCall('client');
	var info = result.info = {};

	getParam(jspath1(json, "$.addresses[?(@.type=='registration')].full_address"), info, 'info.address', null, replaceTagsAndSpaces);
	getParam(json.birth_date, info, 'info.birthday', null, null, parseDateISO);
	getParam(json.last_name + ' ' + json.first_name + ' ' + json.middle_name, info, 'info.fio', null, replaceTagsAndSpaces);
	//getParam(jsonInfo.profile.phone, info, 'info.passport', null, replaceTagsAndSpaces);  //Паспорт там есть вообще
}

function getProducts(){
	if(getProducts.products)
		return getProducts.products;
	getProducts.products = apiCall('/api/v1_1/products?$expand=intents&ext_product_groups=external_cards');
	return getProducts.products;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
    var products = getProducts();
	var accounts = products.filter(function(p) { return p.product_type === 'account' });

	if(!accounts.length) {
		AnyBalance.trace(
			JSON.stringify(products)
		);
		AnyBalance.trace("Счета не найдены.");
		return;
	}
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var _id = accounts[i].id;
		var title = accounts[i].name + ' ' + accounts[i].number.substr(-4);
		
		var acc = {__id: _id, __name: title, num: accounts[i].number};
		
		if(__shouldProcess('accounts', acc)){
			processAccount(accounts[i], acc);
		}
		
		result.accounts.push(acc);
	}
}

function processAccount(account, result) {
	AnyBalance.trace('Обработка счета ' + result.__name);

	getParam(account.balance.amount, result, 'accounts.balance');
	getParam(account.balance.currency, result, ['accounts.currency', 'accounts.balance']);

	getParam(account.name, result, 'accounts.type', null, replaceTagsAndSpaces);
	getParam(account.state_details, result, 'accounts.status');
	getParam(account.open_date, result, 'accounts.date_start', null, null, parseDateISO);

	if(AnyBalance.isAvailable('accounts.transactions')) {
		processAccountTransactions(account, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(result) {
	
    var products = getProducts();
	var cards = products.filter(function(p) { return p.product_type === 'card' });
	if(!cards.length) {
		AnyBalance.trace(
			JSON.stringify(products)
		);
		AnyBalance.trace("Карты не найдены.");
		return;
	}
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = cards[i].id;
		var title = cards[i].name + ' ' + cards[i].number.substr(-4);
		
		var c = {__id: _id, __name: title, num: cards[i].number};
		
		if(__shouldProcess('cards', c)){
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
	AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(card.available_amount.amount, result, 'cards.balance');
	getParam(card.available_amount.currency, result, ['cards.currency', 'cards.balance', 'cards.blocked', 'cards.minpay', 'cards.gracepay', 'cards.fullpay']);
	getParam(card.blocked_amount.amount, result, 'cards.blocked');
	
	getParam(card.requisites.account_number, result, 'cards.accnum', null, replaceTagsAndSpaces);
    getParam(card.name, result, 'cards.type', null, replaceTagsAndSpaces);
	getParam(card.expire_date, result, 'cards.till', null, replaceTagsAndSpaces, parseDateISO);
    getParam(card.holder, result, 'cards.fio', null, replaceTagsAndSpaces);
	getParam(card.state_details, result, 'cards.status');
	
	getParam(jspath1(card, "$.credit_card_loan.credit_limit.amount"), result, 'cards.limit');
	getParam(jspath1(card, "$.credit_card_loan.due_payment.total.amount"), result, 'cards.minpay');
	getParam(jspath1(card, "$.credit_card_loan.due_payment.due_date"), result, 'cards.minpay_till', null, null, parseDateISO);
	getParam(jspath1(card, "$.credit_card_loan.grace_amount.amount"), result, 'cards.gracepay');
	getParam(jspath1(card, "$.credit_card_loan.full_payment.total.amount"), result, 'cards.fullpay');

	getParam(jspath1(card, "$.bonus_cards[?(@.type=='airmiles')].money_amount.amount"), result, 'cards.airmiles');

	if(isAvailable('cards.transactions')) {
		processCardTransactions(card, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(result) {
    var products = getProducts();
	var deposits = products.filter(function(p) { return p.product_type === 'deposit' });

	if(!deposits.length) {
		AnyBalance.trace(
			JSON.stringify(products)
		);
		AnyBalance.trace("Депозиты не найдены.");
		return;
	}
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i){
		var _id = deposits[i].id;
		var title = deposits[i].name + ' ' + deposits[i].number.substr(-4);
		
		var d = {__id: _id, __name: title, num: deposits[i].number};
		
		if(__shouldProcess('deposits', d)){
			processDeposit(deposits[i], d);
		}
		
		result.deposits.push(d);
	}
}

function processDeposit(deposit, result) {
	AnyBalance.trace('Обработка депозита ' + result.__name);

	getParam(deposit.balance.amount, result, 'deposits.balance');
	getParam(deposit.balance.currency, result, ['deposits.currency', 'deposits.balance']);

    getParam(deposit.name, result, 'deposits.type', null, replaceTagsAndSpaces);
	getParam(deposit.close_date, result, 'deposits.till', null, null, parseDateISO);
	getParam(deposit.open_date, result, 'deposits.date_start', null, null, parseDateISO);
	getParam(deposit.state_details, result, 'deposits.status');
	getParam(deposit.rate, result, 'deposits.pct');
	
	getParam(jspath1(deposit, '$.start_money_amount.amount'), result, 'deposits.balance_start');

	if(isAvailable('deposits.transactions')){
		processDepositTransactions(deposit, result);
	}
}

function processCredits(result) {
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к обработчикам");
}

function processBonus(result) {
    var products = getProducts();
	var loyalties = products.filter(function(p) { return p.product_type === 'loyalty' });
	if(loyalties.length > 0){
		getParam(loyalties[0].balance.amount, result, 'bonus');
	}else{
		AnyBalance.trace('Программа лояльности не найдена');
	}
}