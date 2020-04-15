/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':		'application/json',
	'X-Test-UIDM':	'true',
	'X-Client-Type': 'mobile',
	'X-Client-Version': 'a2.35 (672)',
	'User-Agent':		'okhttp/3.12.3',
	'Connection': 'Keep-Alive',
// 	Origin: null,
//	'Sec-Fetch-Mode': null,
//	'Sec-Fetch-Site': null
};


function callApi(url, params){
	var baseurl = 'https://api1.open.ru/np/2-40/';
	var headers = g_headers;
	if(params){
		if(params.__post){
			delete params.__post;
		}else{
			params = JSON.stringify(params);
			headers = addHeaders({'Content-Type': 'application/json'});
		}
	}
	
	var html = AnyBalance.requestPost(baseurl + url, params, headers, {HTTP_METHOD: params ? 'POST' : 'GET'});
	var json = JSON.parse(html);
	if(!json.success && !json.execution && !json.authenticated){
		AnyBalance.trace(html);
		var error = json.message || 'Ошибка обращения к API';
		throw new AnyBalance.Error(error, null, /правильно ввели номер карты/i.test(error));
	}
	return json.data || json;
}

function createPass(size){
	var s = '', alphabet = '0123456789abcdef';
	for(var i=0; i<size; ++i){
		s += alphabet.charAt(Math.floor(Math.random()*alphabet.length)); 
	}
	return s;
}

function register(){
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите номер карты!');

	var json = callApi('api/v1.0/auth/registration/pan/?pan=' + encodeURIComponent(prefs.login), {__post: true});
	var sessionId = json.sessionId;
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код, высланный на ' + json.phone + ' для привязки мобильного банка к телефону', null, {inputType: 'number', time: json.otpLifeTime*1000});

	json = callApi('api/v1.0/auth/registration/otp/validate', {"otp":code,"sessionId":sessionId});

	var password = createPass(40);
	var deviceid = createPass(16);
	json = callApi('api/v1.0/auth/registration/register', {
		"deviceOS":"Android",
		"sessionId":sessionId,
		"imprint": json.imprint,
		"password":password,
		"deviceId":deviceid,
		"deviceName":"AnyBalance",
		"deviceOSVersion":"9",
		"root":false,
		"appVersion":"2.35"
	});

	var login = json.login;

	AnyBalance.setData('pan', prefs.login);
	AnyBalance.setData('login', login);
	AnyBalance.setData('pass', password);
	AnyBalance.setData('deviceid', deviceid);
	AnyBalance.saveData();
}

function loginInner(){
	var json = callApi('sso/oauth2/access_token?realm=/customer&service=dispatcher&client_id=mobilebank&form_type=pin&client_secret=password&grant_type=urn:roox:params:oauth:grant-type:m2m', {
		__post: true,
		device_info: JSON.stringify({
			"device_id": AnyBalance.getData('deviceid'),
			"device_locale":"ru",
			"device_os":2,
			"device_os_version":"9",
			"app_version":672,
			"device_root":0
		})
	});
 
	json = callApi('sso/oauth2/access_token?_eventId=next&realm=/customer&service=dispatcher&client_id=mobilebank&form_type=pin&client_secret=password&grant_type=urn:roox:params:oauth:grant-type:m2m', {
		__post: true,
		execution: json.execution,
		username: AnyBalance.getData('login'),
		password: AnyBalance.getData('pass')
	});

	if(!json.authenticated)
		throw new AnyBalance.Error('Не удалось авторизоваться. Надо заново регистрироваться?');

	AnyBalance.setCookie('api1.open.ru', 'at', json.access_token);
}

function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!AnyBalance.getData('login') || prefs.login !== AnyBalance.getData('pan'))
		register();

	try{
	    loginInner();
	}catch(e){
		AnyBalance.trace(e.message);
		clearAllCookies();
		register();
		loginInner();
	}
 
    __setLoginSuccessful();
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;
	
	var json = callApi('api/v1.0/account/product/account/current/list/');
	AnyBalance.trace("Найдено текущих счетов: " + json.length);
	var accounts = json;

	var json = callApi('api/v1.0/account/accumulation/');
	AnyBalance.trace("Найдено накопительных счетов: " + json.length);
	accounts.push.apply(accounts, json);

	result.accounts = [];

	for(var i = 0; i < accounts.length; i++) {
		var num = accounts[i].accNum;
		var title = (accounts[i].accName || accounts[i].name) + ' ' + accounts[i].balance.currency + ' x' + num.substr(-4);
    	AnyBalance.trace('Найден счет ' + title + ' (' + accounts[i]['@type'] + ')' );
    }


	for(var i = 0; i < accounts.length; i++) {
		var id = accounts[i].accNum;
		var num = accounts[i].accNum;
		var title = (accounts[i].accName || accounts[i].name) + ' ' + accounts[i].balance.currency + ' x' + num.substr(-4);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('accounts', c)) {
			processAccount(accounts[i], c);
		}

		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

	getParam(account.balance.amount, result, 'accounts.balance');
	getParam(account.balance.currency, result, ['accounts.currency', 'accounts.balance']);
	getParam(account.openDate, result, 'accounts.date_start', null, null, parseDateISO);

	getParam(account.currentPercent, result, 'accounts.pct');
	getParam(account.contractName, result, 'deposits.agreement');
	getParam(account.status.value, result, 'deposits.status');

    if(AnyBalance.isAvailable('accounts.transactions')) {
    //    processAccountTransactions(href, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	
	var json = callApi('api/v1.3/card/product/card/');
	var cards = json;

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var id = cards[i].cardId;
		var num = cards[i].maskCardNum;
		var title = cards[i].tariffPlan.name;

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(card.accNum, result, 'cards.accnum');
	getParam(card.cardExpDate, result, 'cards.till', null, null, parseDateISO);
	getParam(card.startDate, result, 'cards.date_start', null, null, parseDateISO);
	getParam(card.status.value, result, 'cards.status');
	getParam(card.balance.amount, result, 'cards.balance');
	getParam(card.creditLimit, result, 'cards.limit');
	getParam(card.loyaltyInfo && card.loyaltyInfo.bonusInfo && card.loyaltyInfo.bonusInfo.totalValue, result, 'cards.bonus');
//	getParam(html, result, 'cards.debt', /Размер задолженности:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.accuredPct', /Начисленные проценты(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.paySum', /Сумма очередного платежа(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.blocked', /Заблокировано:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.overduePct', /штрафы(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card.balance.currency, result, ['cards.currency', 'cards.balance', 'cards.limit', 'cards.debt', 'cards.oPCT', 'cards.accuredPct', 'cards.overduePct', 'cards.paySum', 'cards.blocked']);
	getParam(card.tariffPlan.name, result, 'cards.__tariff');
//	getParam(html, result, 'cards.payDate', /Дата следующего платежа(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

	if(isAvailable('cards.transactions')) {
//		processCardTransactions(href, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;
	
	throw new AnyBalance.Error("Обработка кредитов на данный момент не поддерживается. Пожалуйста, обратитесь к разработчику.");
	
	var table = getParam(html, null, null, /Вклады[\s\S]*?(<table[^>]+"info"[^>]*>[\s\S]*?<\/table>)/i);
	var deposits = getElements(table, /<tr[^>]*>/ig);
	if(!deposits.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти вклады.");
		return;
	}

	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i){
		var id = getParam(deposits[i], null, null, /<span[^>]+nomber_card[^>]*>[^\d]*(\d*)/i, replaceTagsAndSpaces);
		var num = getParam(deposits[i], null, null, /<span[^>]+nomber_card[^>]*>[^\d]*(\d*)/i, replaceTagsAndSpaces);
		var title = getParam(deposits[i], null, null, /<span[^>]+name_card[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], c);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(deposit, result) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    var depbalance = getElement(deposit, /<span[^>]+class="data"/i, replaceTagsAndSpaces);

	getParam(depbalance, result, 'deposits.balance', null, null, parseBalance);
	getParam(depbalance, result, ['deposits.currency', 'deposits.balance'], null, null, parseCurrency);
	getParam(deposit, result, 'deposits.accnum', /Номер счета([^<]*)/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('deposits.pct', 'deposits.agreement', 'deposits.status', 'deposits.till', 'deposits.date_start', 'deposits.transactions')){
		var href = getParam(deposit, null, null, /location\.href\s*=\s*['"]\/?([^'"]*)/i);
		if(!href) {
			AnyBalance.trace(deposit);
			AnyBalance.trace("Не удалось найти ссылку на выписку по депозиту" + result.__name);
			return;
		}
	    
		var html = AnyBalance.requestGet(baseurl + href, g_headers);
		
		getParam(html, result, 'deposits.pct', /Ставка:(?:[^>]*>){1}([^%]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'deposits.agreement', /Договор(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.status', /Статус(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.till', /остаток на(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'deposits.date_start', /Дата открытия(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	    
		if(isAvailable('deposits.transactions')) {
			processDepositTransactions(href, result);
		}
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;
	throw new AnyBalance.Error("Обработка кредитов на данный момент не поддерживается. Пожалуйста, обратитесь к разработчику.");
}
function processInfo(html, result){
    var info = result.info = {};
    var json = callApi('api/v1.0/client-info/client/info/');

    getParam(json.clientFullName, info, 'info.fio');
}
