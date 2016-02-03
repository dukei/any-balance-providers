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

var baseurl = 'https://ibank.rncb.ru/prest-api/';
var g_token;
var appVersion = '1.9.1'
var device_name = 'AnyBalance API';

var errorsDesc = {
	invalid_grant: 'Неверный логин или пароль!'
}

function apiCall(action, params) {
	var act = action.split(':');
	var method = act[0];
	var dest = act[1];
	
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
			throw new AnyBalance.Error('Ошибка авторизации, проверьте логин и пароль.');
		
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
		
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var json = getJson(html);
	
	return json;
}

function checkSetToken(token) {
	if(!token)
		throw new AnyBalance.Error('Не пришел токен в ответе банка, сайт изменен?');
	setToken(token);
}

function setToken(token) {
	AnyBalance.setData('access_token', g_token = token);
	AnyBalance.saveData();
}

function setCredentials(web_mobile_login, web_mobile_password) {
	if(!web_mobile_login || !web_mobile_password)
		throw new AnyBalance.Error('Неудалось сохранить данные авторизации. ' + 'web_mobile_login: ' + web_mobile_login + ' web_mobile_password: ' + web_mobile_password);
	
	var set = {
		'web_mobile_login': web_mobile_login,
		'web_mobile_password': web_mobile_password,
	}
	
	AnyBalance.setData('credentials', set);
	AnyBalance.saveData();
}

function getCredentials() {
	return AnyBalance.getData('credentials');
}

function getToken() {
	return g_token = AnyBalance.getData('access_token');
}

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(!getToken()) {
		// Еще не привязано устройство, надо привязать
		var json = apiCall('POST:authentication/oauth2', [
			['grant_type', 'password'],
			['password', prefs.password],
			['username', prefs.login],
		]);
		
		checkSetToken(json.access_token);
	
		if(json.scope == 'otp') {
			AnyBalance.trace('Необходимо ввести код для привязки устройства.');
			var code = AnyBalance.retrieveCode("Пожалуйста, введите код из смс");
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
			AnyBalance.trace('Устройство успешно привязано.');
			__setLoginSuccessful();
		}
	} else {
		AnyBalance.trace('Устройство уже привязано, отлично, используем существующую сессию');
		
		var credentials = getCredentials();
		if(!credentials) {
			setToken();
			throw new AnyBalance.Error('Устройство привязано неправильно, сбрасываем сессию.');
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
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;
	
	var json = apiCall('GET:protected/accounts');

	var accounts = json;
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var id = acc.benefacc;
		var title = acc.acctype + ' ' + id + ' ' + acc.curr;
		
		var c = {__id: id, __name: title};
		
		if(__shouldProcess('accounts', c)) {
			// processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
	getParam(account.acc, result, 'accounts.num');
    getParam(account.acctype, result, 'accounts.type');
    getParam(account.balance, result, 'accounts.balance', null, null, parseBalance);
    getParam(account.currency, result, ['accounts.currency' , 'accounts.balance'], null, null, parseCurrency);
    getParam(account.date, result, 'accounts.date_start', null, null, parseDateWord);
	
	if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(html, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	
	var json = apiCall('GET:protected/cards');

	var cards = json;
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i) {
		var card = cards[i];
		
		var id = card.id
		var title = card.alias

		var c = {__id: id, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    getParam(card.balance + '', result, 'cards.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(card.availableAmount + '', result, 'cards.availableAmount', null, replaceTagsAndSpaces, parseBalance);
    getParam(card.lockedAmount + '', result, 'cards.lockedAmount', null, replaceTagsAndSpaces, parseBalance);
	getParam(card.currencyCode, result, ['cards.currency', 'cards']);
	getParam(card.contractNumber, result, 'cards.contractNumber');
	getParam(card.number, result, 'cards.plainNumber');
	getParam(card.formattedName, result, 'cards.formattedName');
	getParam(card.statusDescription, result, 'cards.statusDescription');
	getParam(card.type, result, 'cards.type');
	getParam(card.expireDate*1, result, 'cards.expireDate');
	
	if(typeof processCardTransactions != 'undefined')
		processCardTransactions(card, result);
}

function processInfo(html, result) {
	var json = apiCall("GET:protected/client");
	
    var info = result.info = {};
	
    getParam(json.fullName, info, 'fio');
    getParam(json.phoneMobile, info, 'mphone');
    // getParam(json., info, 'email');
}
