/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6,uk;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://online.oschadbank.ua',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
};

var baseurl = 'https://online.oschadbank.ua/';
var gDataJson;

function login(prefs, result) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введіть логін!');
	checkEmpty(prefs.password, 'Введіть пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'wb/', g_headers);

	html = AnyBalance.requestGet(baseurl + 'wb/api/v2/session', addHeaders({
		Referer: baseurl + 'wb/',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(html);
	if(json.status != 'authenticated'){
		html = AnyBalance.requestPost(baseurl + 'wb/api/v2/session', JSON.stringify({
			login: prefs.login,
			password: prefs.password,
			captcha: ''
		}), addHeaders({
			Referer: baseurl + 'wb/',
			'Content-Type': 'application/json',
			'X-Requested-With': 'XMLHttpRequest'
		}));
		
		json = getJson(html);

		if(json._status == 'confirmationRequired'){
			AnyBalance.trace('Потребовалась доп. авторизация: ' + html);

			if(json.confirmation.authTypes){
				AnyBalance.trace('Выбираем способ подтверждения...');

				if(json.confirmation.authTypes.indexOf('otp_sms') < 0){
					AnyBalance.trace(html);
					throw new AnyBalance.Error('Ни один способ доп. подтверждения входа, требуемый данным логином, пока не поддерживается. Сайт изменен?');
				}
			    
				//посылаем смс запрос на первый телефон
				json._status = null;
				json.captcha = '';
				json.login = prefs.login;
				json.password = prefs.password;
				json.confirmation.authType = 'otp_sms';
				json.confirmation.phoneId = json.confirmation.phones[0].id;
					
				html = AnyBalance.requestPost(baseurl + 'wb/api/v2/session', JSON.stringify(json), addHeaders({
					Referer: baseurl + 'wb/',
					'Content-Type': 'application/json',
					'X-Requested-With': 'XMLHttpRequest'
				}));
				
				json = getJson(html);
			}

			var code = AnyBalance.retrieveCode('На ваш телефонний номер ' + json.confirmation.challenge.phone + ' відправлено СМС-повідомлення з одноразовим паролем. Будь ласка, введіть пароль', null, {inputType: 'number', time: 180000});

			AnyBalance.trace('Отправляем код подтверждения...');

			json._status = null;
			json.captcha = '';
			json.login = prefs.login;
			json.password = prefs.password;
			json.confirmation.response = code;

			html = AnyBalance.requestPost(baseurl + 'wb/api/v2/session', JSON.stringify(json), addHeaders({
				Referer: baseurl + 'wb/',
				'Content-Type': 'application/json',
				'X-Requested-With': 'XMLHttpRequest'
			}));
			
			json = getJson(html);
		}

		if(json.status != 'authenticated'){
			var errors = {
				INVALID_ONE_TIME_PASSWORD: 'Невірний одноразовий пароль',
				INVALID_LOGIN_OR_PASSWORD: 'Невірний логін або пароль',
			};

			if(json._error)
				throw new AnyBalance.Error(errors[json._error.code] || json._error.code, null, /INVALID_LOGIN_OR_PASSWORD/i.test(json._error.code));

			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в интернет банк. Сайт изменен?');
		}
	}else{
		AnyBalance.trace('Используем существующую сессию');
	}

	__setLoginSuccessful();
	
	return json;
}

function processProfile(html, result) {
	var info = getProductJson();
	
	for(var i=0; i < info.length; ++i) {
		var curr = info[i];
		if(curr.owner) {
			result.profile = {};
			
			getParam(curr.owner.fullName, result.profile, 'profile.fio');
			getParam(curr.owner.itn, result.profile, 'profile.itn');
			break;
		}
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	var cards = getProductJson('card');
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.id;
		var title = card.number;
		
		var c = {__id: _id, __name: title, num: title};
		
		if(__shouldProcess('cards', c)){
			processCard(card, c);
		}
		
		result.cards.push(c);
	}
}

function processCard(prod, result) {
    getParam(prod.balances.available.value, result, 'cards.balance', null, null, parseBalance);
    if(prod.balances.full_crlimit)
    	getParam(prod.balances.full_crlimit.value, result, 'cards.maxlimit', null, null, parseBalance);
	getParam(prod.card.expiryDate + '', result, 'cards.till', null, null, parseDate);
    if(prod.balances.total_due)
    	getParam(prod.balances.total_due.value, result, 'cards.debt', null, null, parseBalance);
    getParam(prod.balances['06'].value, result, 'cards.mz', null, null, parseBalance);
    getParam(prod.card.accountNumber, result, 'cards.rr');
    getParam(prod.balances.available.currency, result, ['cards.currency', 'cards.balance', 'cards.maxlimit', 'cards.debt', 'cards.mz']);
	getParam(prod.number, result, 'cards.cardNumber');
	
	//https://online.oschadbank.ua/wb/history#contracts/03e500f461d4d94837a87ff39d4acc6871489fc1
	
	if(typeof processCardTransactions != 'undefined')
		processCardTransactions(prod, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    var accounts = getProductJson('cardAccount');
   
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i) {
		var account = accounts[i];
		var _id = account.id;
		var title = account.number;
		
		var c = {__id: _id, __name: title, num: title};
		
		if(__shouldProcess('accounts', c)){
			processAccount(account, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(prod, result) {
    getParam(prod.balances.available.value, result, 'accounts.balance', null, null, parseBalance);
    getParam(prod.balances.full_crlimit.value, result, 'accounts.maxlimit', null, null, parseBalance);
    getParam(prod.balances.total_due.value, result, 'accounts.debt', null, null, parseBalance);
    getParam(prod.balances['06'].value, result, 'accounts.mz', null, null, parseBalance);
    getParam(prod.cardAccount.accountNumber, result, 'accounts.rr');
    getParam(prod.balances.available.currency, result, ['accounts.currency', 'accounts.balance', 'accounts.maxlimit', 'accounts.debt', 'accounts.mz']);
	
	if(typeof processAccountTransactions != 'undefined')
		processAccountTransactions(prod, result);
}

// Служебные функции
function getProductJson(type) {
	if(!gDataJson) {
		var html = AnyBalance.requestGet(baseurl + 'wb/api/v2/contracts?system=W4C', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
		var json = gDataJson = getJson(html);
	} else {
		var json = gDataJson;
	}
	
	if(!isset(type))
		return json;
	
	var filter = json.filter(function(element) {
		return element.type == type;
	});
	
	return filter;
}

// Сортируем от большего к меньшему
function sortByKey(array, key) {
	return array.sort(function(a, b) {
		var x = a[key];	var y = b[key];
		return ((x > y) ? -1 : ((x < y) ? 1 : 0));
	});
}