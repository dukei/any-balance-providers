/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
	'Origin': 'https://online.akbars.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.73 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest',
	'Content-Type': 'application/json'
};

var baseurl = 'https://online.akbars.ru/wb/';

function login(prefs) {
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestGet(baseurl + 'menu', g_headers);
	
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
    }
	
	var url = AnyBalance.getLastUrl();
	
    if (!/CARDS|ACCOUNTS/i.test(url)) {
        var params = {
			login: prefs.login, 
			password: prefs.password
		};
		
		var json = apiCall('POST:api/v2/session', {
			login: prefs.login, 
			password: prefs.password
		});
    } else {
        AnyBalance.trace('Уже залогинены, используем существующую сессию')
		
		var json = apiCall('GET:api/v2/session');
    }

	if(json._status == 'confirmationRequired')
		throw new AnyBalance.Error('Для входа потребовался одноразовый пароль. Такой вход пока не поддерживается. Пожалуйста, отключите требование подтверждения для входа в настройках интернет-банка.');

    __setLoginSuccessful();

    return json;
}

function apiCall(action, params) {
	var errorCodes = {
		'ACCOUNT_BLOCKED': 'Учетная запись заблокирована',
		'INVALID_LOGIN_OR_PASSWORD': 'Неправильный логин или пароль'
	};
	
	var act = /^(.+?):(.+$)/i.exec(action);
	if(!act)
		throw new AnyBalance.Error('Неправильно сформирована команда для apiCall');
	
	var method = act[1];
	var methodApi = act[2];
	
	if(method == 'GET') {
		var html = AnyBalance.requestGet(baseurl + methodApi, g_headers);
	} else
		var html = AnyBalance.requestPost(baseurl + methodApi, JSON.stringify(params), addHeaders({Referer: baseurl}));
	
	var json = getJson(html);
	
	if(json._error) {
		var error = errorCodes[json._error.code];
		if (error)
            throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
        
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Неизвестная ошибка вызова API. Сайт изменен?');
	}

	return json;
}

/**
Данные получаются всегда одним способом, натравил все функции сюда, если уже есть данные - запрашивать не будет ничего
*/
var dataJson;

function getCardsAccountDataJson(filter) {
	// Если еще не получали json с данными, самое время его запросить
	if (!dataJson) {
		var json = dataJson = apiCall('GET:api/v2/contracts?system=W4C&filter=addData.CLASSIFICATION_FACTOR:DEBIT');
	}
	
	// Фильтруем и вернет только то, что запрошено
	if(isset(filter)) {
		var filtred = [];
		for(var i = 0; i < dataJson.length; i++) {
			var curr = dataJson[i];
			// if(new RegExp(filter, 'i').test(curr.type))
			if(curr.type == filter && curr[curr.type].status == 'active')
				filtred.push(curr);
		}
		json = filtred;
	}
	return json;
}

function getAllBalances(account, result, resultPath) {
	// Получение балансов типично
	var balances = ['available>balance','cr_limit>limit','blocked','interests>pct','minpay','overdue','overlimit','total_due>debt'];
	for(var i = 0; i < balances.length; i++){
		var arr = balances[i].split(/>/);
		var balanceFrom = arr[0], balanceTo = arr[1] || balanceFrom;
		getParam(jspath1(account, 'balances.' + balanceFrom + '.value'), result, resultPath + '.' + balanceTo, null, null, parseBalance)
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(json, result) {
    if (!isAvailable('accounts'))
        return;
	
	var accounts = getCardsAccountDataJson('cardAccount');
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
    result.accounts = [];
	
	for (var i = 0; i < accounts.length; ++i) {
        var acc = accounts[i];
        var id = acc.id;
        var title = acc.number;
		
		var c = {__id: id, __name: title, num: acc.number};
		
		if (__shouldProcess('accounts', c)) {
            processAccount(acc, c);
        }
		
		result.accounts.push(c);
    }
}

function processAccount(account, result) {
    AnyBalance.trace('Обработка счета ' + result.__name);
	
	getParam(jspath1(account, 'currency'), result, ['accounts.currency', 'accounts']);
	// Остальное типично
	getAllBalances(account, result, 'accounts');

    if (isAvailable('accounts.transactions')) {
        processCardOrAccountTransactions(result, 'accounts.transactions.');
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(json, result) {
    if (!isAvailable('cards'))
        return;

	var cards = getCardsAccountDataJson('card');
	
    AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
    
    for (var i = 0; i < cards.length; ++i) {
        var acc = cards[i];
        var id = acc.id;
        var title = acc.number;

        var c = {__id: id, __name: title, num: acc.number};

        if (__shouldProcess('cards', c)) {
            processCard(acc, c);
        }

        result.cards.push(c);
    }
}

function processCard(card, result, cardDetailsJson) {
	getParam(jspath1(card, 'currency'), result, ['cards.currency', 'cards']);
	// Остальное типично
	getAllBalances(card, result, 'cards');
	
	getParam(jspath1(card, 'addData.NICE_CARD_EXPIRE'), result, 'cards.till', null, null, parseDate);
	getParam(jspath1(card, 'addData.CARDHOLDER_NAME'), result, 'cards.holder', null, replaceTagsAndSpaces);
	getParam(jspath1(card, 'addData.PROD_NAME'), result, 'cards.name');
	getParam(jspath1(card, 'addData.CARD_ID'), result, 'cards.id');
	
    if (isAvailable('cards.transactions')) {
        processCardOrAccountTransactions(result, 'cards.transactions.');
    }
}

function processInfo(json, result) {
    var info = result.info = {};
	
    getParam(jspath1(json, 'user.displayName'), info, 'info.fio');
    getParam(jspath1(json, 'user.login'), info, 'info.login');
    getParam(jspath1(json, 'user.id'), info, 'info.id');
    getParam(jspath1(json, 'user.w4cClientId'), info, 'info.w4cClientId');
    getParam(jspath1(json, 'user.w4cClientId.phoneNumbers.displayValue'), info, 'info.mphone');
}
