/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/plain, */*',
	'Accept-Charset': 'UTF-8',
	'Accept-Language': 'ru',
	'Connection':'Keep-Alive',
	'User-Agent':'Dalvik/1.6.0 (Linux; U; Android 4.1.1; Android SDK built for x86 Build/JRO03H)',
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	'X-ApiVersion': appVersion
};

var baseurl = 'https://online.rncb.ru/prest-api/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

var g_token;
var appVersion = '1.9.1'
var device_name = 'AnyBalance API';

var errorsDesc = {
	invalid_grant: 'Неверный логин или пароль!'
}

function setBaseurl(_baseurl){
	baseurl = _baseurl;
}

function apiCall(action, params) {
	var act = action.split(':');
	var method = act[0];
	var dest = act[1];
//	AnyBalance.trace('Запрос: ' + JSON.stringify(dest));
	
	if(method == 'POST') {
		var html = AnyBalance.requestPost(baseurl + dest, params, !g_token ? g_headers : addHeaders({
			// Referer: baseurl,
			Authorization: 'Bearer ' + g_token
		}));
	} else {
		var html = AnyBalance.requestGet(baseurl + dest, addHeaders({
			Authorization: 'Bearer ' + g_token
		}));
	}
	
	var code = AnyBalance.getLastStatusCode();
	if(code >= 400){
		AnyBalance.trace(html);
		if(code == 401)
			throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
		
		if(html) {
			var json = getJson(html);
			
			var error = json.error;
			if(error == 'invalid_grant') {
				setToken();
				error = 'Неверный логин или пароль';
			} else {
				error = json.error_description || (json.error ? errorsDesc[json.error] : json.error);
			}
			
			if (error)
				throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}
		
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера. Попробуйте обновить данные позже');
	}
	
	var json = getJson(html);
//	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	
	return json;
}

function checkSetToken(token) {
	if(!token)
		throw new AnyBalance.Error('Не пришел токен в ответе банка. Сайт изменен?');
	setToken(token);
}

function setToken(token) {
	AnyBalance.setData('access_token', g_token = token);
	AnyBalance.saveData();
}

function setCredentials(web_mobile_login, web_mobile_password) {
	if(!web_mobile_login || !web_mobile_password)
		throw new AnyBalance.Error('Не удалось сохранить данные авторизации. ' + 'web_mobile_login: ' + web_mobile_login + ' web_mobile_password: ' + web_mobile_password);
	
	var set = {
		'web_mobile_login': web_mobile_login,
		'web_mobile_password': web_mobile_password,
	}
	
	AnyBalance.setData('credentials', set);
	AnyBalance.saveData();
}

function getCredentials(prefs) {
	if(prefs['__debugData']) {
		AnyBalance.trace('Используем данные из преференсов...');
		return prefs['__debugData'].credentials;
	}
	
	return AnyBalance.getData('credentials');
}

function getToken(prefs) {
	if(prefs['__debugData']) {
		AnyBalance.trace('Используем данные из преференсов...');
		return g_token = prefs['__debugData']['access_token'];
	}	
	
	return g_token = AnyBalance.getData('access_token');
}

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(!getToken(prefs)) {
		// Еще не привязано устройство, надо привязать
		var json = apiCall('POST:authentication/oauth2', [
			['grant_type', 'password'],
			['password', prefs.password],
			['username', prefs.login],
		]);
		
		checkSetToken(json.access_token);
	
		if(json.scope == 'otp') {
			AnyBalance.trace('Необходимо ввести код для привязки устройства');
			var code = AnyBalance.retrieveCode("Пожалуйста, введите код из SMS");
			AnyBalance.trace('Код получен: ' + code);
			
			json = apiCall('POST:authentication/otp', [
				['grant_type', 'password'],
				['password', code],
				['device_name', device_name],
			]);
			
			var web_mobile_login = json.username;
			var web_mobile_password = json.password;
			
			setCredentials(web_mobile_login, web_mobile_password);
			
			json = apiCall('POST:authentication/oauth2', {
				platform: 'Android',
				model: device_name,
				osVersion: '5.0',
				password: web_mobile_password,
				appVersion: appVersion,
				uuid: 'ee5ba11cfba9170c',
				web_mobile_login: web_mobile_login,
				jailBreak: 'false',
				grant_type: 'password'
			});
			
			checkSetToken(json.access_token);
			AnyBalance.trace('Устройство успешно привязано');
			__setLoginSuccessful();
		}
	} else {
		AnyBalance.trace('Устройство уже привязано. Используем текущую сессию');
		
		var credentials = getCredentials(prefs);
		if(!credentials) {
			setToken();
			throw new AnyBalance.Error('Устройство привязано неправильно. Сбрасываем сессию');
		}
		
		var json = apiCall('POST:authentication/oauth2', {
			platform: 'Android',
			model: device_name,
			osVersion: '5.0',
			password: credentials.web_mobile_password,
			appVersion: appVersion,
			uuid: 'ee5ba11cfba9170c',
			web_mobile_login: credentials.web_mobile_login,
			jailBreak: 'false',
			grant_type: 'password'
		});
		
		checkSetToken(json.access_token);
	}
	
	return json;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;
	
	var json = apiCall('GET:protected/accounts');

	var accounts = json;
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var account = accounts[i];
		var id = account.id;
		var title = account.currencyCode + ' ' + account.number;
		
		var c = {__id: id, __name: title};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(account, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
	getParam(account.number, result, 'accounts.contractNumber');
    getParam(g_type[account.type]||account.type, result, 'accounts.accountType');
	getParam(account.depositPercent + '', result, 'accounts.percent', null, replaceTagsAndSpaces, parseBalance);
    getParam(account.balance + '', result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(g_currency[account.currencyCode]||account.currencyCode, result, ['accounts.currency', 'accounts.balance']);
	getParam(account.depositName, result, 'accounts.formattedName', /.*/, [/\"/g, '']);
	getParam(g_state[account.state]||account.state, result, 'accounts.statusDescription');
    getParam(account.depositOpenDate, result, 'accounts.openDate');
	getParam(account.depositEndDate, result, 'accounts.endDate');
	
	if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(account, result);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	
	var json = apiCall('GET:protected/cards');

	var cards = json;
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i) {
		var card = cards[i];
		
		var id = card.id;
		var title = card.currencyCode + ' ' + card.number;

		var c = {__id: id, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
	AnyBalance.trace('Обработка карты ' + result.__name);
	
    getParam(card.balance + '', result, 'cards.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(card.availableAmount + '', result, 'cards.availableAmount', null, replaceTagsAndSpaces, parseBalance);
    getParam(card.lockedAmount + '', result, 'cards.lockedAmount', null, replaceTagsAndSpaces, parseBalance);
	getParam(g_currency[card.currencyCode]||card.currencyCode, result, ['cards.currency', 'cards.balance', 'cards.availableAmount', 'cards.lockedAmount', 'cards.creditLimit']);
	getParam(card.cardAccount && card.cardAccount.number, result, 'cards.contractNumber');
	getParam(card.cardAccount && card.cardAccount.creditLimit, result, 'cards.creditLimit', null, replaceTagsAndSpaces, parseBalance);
	getParam(card.openDate, result, 'cards.openDate');
	getParam(card.expireDate, result, 'cards.endDate');
	getParam(card.number, result, 'cards.number', /\d{16}$/, [/(\d{4})(\d{2})(\d{2})(\d{4})(\d{4})/, '$1 $2** **** $5']);
	getParam(card.cardName, result, 'cards.formattedName');
	getParam(card.statusDescription, result, 'cards.statusDescription');
	getParam(card.type, result, 'cards.type');
	getParam(card.expireDate*1, result, 'cards.expireDate');
	
	if(typeof processCardTransactions != 'undefined') {
		processCardTransactions(card, result);
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(result) {
    if(!AnyBalance.isAvailable('deposits'))
        return;
	
	var json = apiCall('GET:protected/accounts');
		
	var deposits = json;
	
	AnyBalance.trace('Найдено счетов: ' + deposits.length);
	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i){
        var deposit = deposits[i];
	    if(!/DEPOSIT/i.test(deposit.type)){
			continue;
		}else{
		    var id = deposit.id;
		    var title = deposit.currencyCode + ' ' + deposit.number;
		
		    var c = {__id: id, __name: title};
		
		    if(__shouldProcess('deposits', c)) {
		    	processDeposit(deposit, c);
		    }
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(deposit, result){
    AnyBalance.trace('Обработка депозита ' + result.__name);
	
	getParam(deposit.number, result, 'deposits.contractNumber');
    getParam(g_type[deposit.type]||deposit.type, result, 'deposits.accountType');
	getParam(deposit.depositPercent + '', result, 'deposits.percent', null, replaceTagsAndSpaces, parseBalance);
    getParam(deposit.balance + '', result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(g_currency[deposit.currencyCode]||deposit.currencyCode, result, ['deposits.currency', 'deposits.balance']);
	getParam(deposit.depositName, result, 'deposits.formattedName', /.*/, [/\"/g, '']);
	getParam(g_state[deposit.state]||deposit.state, result, 'deposits.statusDescription');
    getParam(deposit.depositOpenDate, result, 'deposits.openDate');
	getParam(deposit.depositEndDate, result, 'deposits.endDate');
	
	if(AnyBalance.isAvailable('deposits.transactions')) {
        processDepositTransactions(deposit, result);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(result) {
	
	throw new AnyBalance.Error('Кредиты пока не поддерживаются. Пожалуйста, обратитесь к автору провайдера для добавления продукта');
    
	if(!AnyBalance.isAvailable('credits'))
        return;
	
	var json = apiCall('GET:protected/credits');

	var credits = json;
	
	AnyBalance.trace('Найдено кредитов: ' + credits.length);
	result.credits = [];
	
	for(var i=0; i < credits.length; ++i){
        var credit = credits[i];
		var id = credit.id;
		var title = credit.currencyCode + ' ' + credit.number;
		
		var c = {__id: id, __name: title};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credit, c);
		}
		
		result.credits.push(c);
	}
}

function processCredit(credit, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);
	
    getParam(credit.number, result, 'credits.contractNumber');
    getParam(g_type[credit.type]||credit.type, result, 'credits.accountType');
	getParam(credit.creditPercent + '', result, 'credits.percent', null, replaceTagsAndSpaces, parseBalance);
    getParam(credit.balance + '', result, 'credits.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(g_currency[credit.currencyCode]||credit.currencyCode, result, ['credits.currency', 'credits.balance']);
	getParam(credit.creditName, result, 'credits.formattedName', /.*/, [/\"/g, '']);
	getParam(g_state[credit.state]||credit.state, result, 'credits.statusDescription');
    getParam(credit.creditOpenDate, result, 'credits.openDate');
	getParam(credit.creditEndDate, result, 'credits.endDate');
	
	if(AnyBalance.isAvailable('credits.transactions')) {
        processCreditTransactions(credit, result);
    }
}

function processInfo(result){
	if(!AnyBalance.isAvailable('info'))
        return;

	result.info = {};

	var json = apiCall("GET:protected/client");

    getParam(json.phone, result.info, 'info.phone', null, replaceNumber);
	getParam(json.fullName, result.info, 'info.fio', null, null, capitalFirstLetters);

}
