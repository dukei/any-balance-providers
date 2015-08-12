/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var baseurl = 'https://online.trust.ru/';
var baseurlAPI = baseurl + 'api/v1/';

var currencys = {
	810: 'р',
}

var states = {
	0: 'Активен',
	1: 'Скрыт'
}

function apiCAll(action, params) {
	var html = AnyBalance.requestPost(baseurlAPI + action, params, addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': '*/*',
		'CSP': 'active'
	}));
	
	var json = getJson(html);
	
	if(json.error) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error);
	}
	
	return json;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'signin.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var json = apiCAll('sessions', {
		'username': prefs.login,
		'password': prefs.password,
	});
	
	if(prefs.type == 'acc')
        fetchAPIAccount(json);
    else if(prefs.type == 'dep')
        fetchAPIDeposit(json);
    else
        fetchAPICard(json); //По умолчанию карты будем получать
}

function fetchAPICard(jsonInfo){
	var prefs = AnyBalance.getPreferences();
	if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
		throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");
	
	// Есть разные кабинеты, в которых карты в json или в json.main
	if(!jsonInfo.main)
		jsonInfo.main = jsonInfo;
	
	if(!jsonInfo.main || !jsonInfo.main.cards)
		throw new AnyBalance.Error('Не удалось найти данные по картам в ответе банка, попробуйте обновить данные позже.');
	
	var card;
	if(prefs.cardnum) {
		for(var i = 0; i < jsonInfo.main.cards.length; i++) {
			var curr = jsonInfo.main.cards[i];
			
			if(endsWith(curr.number, prefs.cardnum)) {
				AnyBalance.trace('Нашли нужную карту с последними цифрами ' + prefs.cardnum);
				AnyBalance.trace(JSON.stringify(curr));
				card = curr;
				break
			}
		}
	} else {
		AnyBalance.trace('В настройках не указано по какой карте нужно получать данные, возьмем первую...');
		card = jsonInfo.main.cards[0];
	}

	if(!card)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));

    var result = {success: true};
	
	getParam(card.number, result, 'cardnum', null, replaceTagsAndSpaces);
	getParam(card.number, result, '__tariff', null, replaceTagsAndSpaces);
    getParam(card.type, result, 'type', null, replaceTagsAndSpaces);
	getParam(card.dateExpire, result, 'till', null, replaceTagsAndSpaces, parseDateWord);
	getParam(card.rest + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[card.currency], result, ['currency', 'balance']);
    getParam(card.cardHolderName, result, 'fio', null, replaceTagsAndSpaces);
	getParam(states[card.state], result, 'status');
	
    AnyBalance.setResult(result);
}

function fetchAPIAccount(jsonInfo){
	var prefs = AnyBalance.getPreferences();
	if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
		throw new AnyBalance.Error("Введите 4 последних цифры номера счета или не вводите ничего, чтобы показать информацию по первому счету");

	// Есть разные кабинеты, в которых карты в json или в json.main
	if(!jsonInfo.main)
		jsonInfo.main = jsonInfo;
	
	if(!jsonInfo.main || !jsonInfo.main.accounts)
		throw new AnyBalance.Error('Не удалось найти данные по счетам в ответе банка, попробуйте обновить данные позже.');
	
	var account;
	if(prefs.cardnum) {
		for(var i = 0; i < jsonInfo.main.accounts.length; i++) {
			var curr = jsonInfo.main.accounts[i];
			
			if(endsWith(curr.number, prefs.cardnum)) {
				AnyBalance.trace('Нашли нужны счте с последними цифрами ' + prefs.cardnum);
				AnyBalance.trace(JSON.stringify(curr));
				account = curr;
				break
			}
		}
	} else {
		AnyBalance.trace('В настройках не указано по какому счету нужно получать данные, возьмем первый...');
		account = jsonInfo.main.accounts[0];
	}

	if(!account)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));

    var result = {success: true};
	
	getParam(account.number, result, 'accnum', null, replaceTagsAndSpaces);
	getParam(account.number, result, '__tariff', null, replaceTagsAndSpaces);
    getParam(account.type, result, 'type', null, replaceTagsAndSpaces);
	getParam(account.rest + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[account.currency], result, ['currency', 'balance']);
	getParam(states[account.state], result, 'status');
	
    AnyBalance.setResult(result);
}

function fetchAPIDeposit(jsonInfo){
	var prefs = AnyBalance.getPreferences();
	if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
		throw new AnyBalance.Error("Введите 4 последних цифры номера счета или не вводите ничего, чтобы показать информацию по первому счету");

	// Есть разные кабинеты, в которых карты в json или в json.main
	if(!jsonInfo.main)
		jsonInfo.main = jsonInfo;
	
	if(!jsonInfo.main || !jsonInfo.main.deposits)
		throw new AnyBalance.Error('Не удалось найти данные по счетам в ответе банка, попробуйте обновить данные позже.');
	
	var account;
	if(prefs.cardnum) {
		for(var i = 0; i < jsonInfo.main.deposits.length; i++) {
			var curr = jsonInfo.main.deposits[i];
			
			if(endsWith(curr.number, prefs.cardnum)) {
				AnyBalance.trace('Нашли нужны счте с последними цифрами ' + prefs.cardnum);
				AnyBalance.trace(JSON.stringify(curr));
				account = curr;
				break
			}
		}
	} else {
		AnyBalance.trace('В настройках не указано по какому счету нужно получать данные, возьмем первый...');
		account = jsonInfo.main.deposits[0];
	}

	if(!account)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));

    var result = {success: true};
	
	getParam(account.number, result, 'accnum', null, replaceTagsAndSpaces);
	getParam(account.number, result, '__tariff', null, replaceTagsAndSpaces);
    getParam(account.type, result, 'type', null, replaceTagsAndSpaces);
	getParam(account.rest + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[account.currency], result, ['currency', 'balance']);
	getParam(states[account.state], result, 'status');
	getParam(account.rate, result, 'pct', null, replaceTagsAndSpaces, parseBalance);
    getParam(account.closed, result, 'till', null, replaceTagsAndSpaces, parseDateWord);
	
    AnyBalance.setResult(result);
}