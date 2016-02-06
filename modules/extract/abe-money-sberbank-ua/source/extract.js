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
	
	if (!/logout/i.test(html)) {
		var execKey = getParam(html, null, null, /execution=([\s\S]{4})/i);
	  
		var href = getParam(html, null, null, /id="FORM_FAST_LOGIN"[^>]*action="\/([^"]*)/i);
		if(!href) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти ссылку на вход в кабинет, сайт изменен?');
		}
		
		var params = createFormParams(html, function(params, str, name, value) {  
			if (name == 'AUTH_METHOD') 
				return 'FAST_PWA';  
			if (name == 'Login') 
				return prefs.login;
			else if (name == 'password')
				return prefs.password;
			else if (name == '_flowExecutionKey')
				return execKey; 
			else if (name == '_eventId')
				return 'submitUserId'; 
			return value;
		});
		
		html = AnyBalance.requestPost(baseurl + href, params, addHeaders({Referer: baseurl + 'wb/auth/userlogin?execution=' + execKey}));
		AnyBalance.trace(baseurl + 'wb/auth/userlogin?execution=' + execKey);
		
		__setLoginSuccessful();
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Смена Пароля(?:[\s\S]*?<[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);
		error = getElement(html, /<div[^>]+form-error[^>]*>/i);
		if(error)
			error = replaceAll(error, replaceTagsAndSpaces);
		if (error) 
			throw new AnyBalance.Error(error, null, /неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не вдалося зайти в особистий кабінет. Сайт змінено?');
	}
	
	return html;
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
    getParam(prod.balances.full_crlimit.value, result, 'cards.maxlimit', null, null, parseBalance);
	getParam(prod.card.expiryDate + '', result, 'cards.till', null, null, parseDate);
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
		var html = AnyBalance.requestGet(baseurl + 'wb/api/v1/contracts?system=W4C', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
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