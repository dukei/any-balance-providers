/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
}

var g_currency = {
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: 'Ұ',
	CHF: '₣',
	CNY: '¥',
	undefined: ''
};

var g_statusCard = {
	0: 'Активна',
	1: 'Не активна'
};

var g_statusAcc = {
	0: 'Активен',
	1: 'Не активен'
};

var baseurl = 'https://online.gpb.ru';
var g_csrf;

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(/^\d{11}$/.test(prefs.login), 'Введите номер телефона - 11 цифр без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/login', g_headers);
	AnyBalance.trace(html);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт Газпромбанка временно недоступен. Попробуйте еще раз позже');
    }
	
	var g_csrf = getParam(html, null, null, /<meta[^>]*name="_csrf"[^>]*content="([^"]*)"/i);
	
	if (!g_csrf) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
		
	var params = [
	    ['name','%2B'+prefs.login],
        ['pwd',prefs.password],
        ['locale','ru_RU'],
		['lang','ru-RU']
	];
	
	var html = AnyBalance.requestPost(baseurl + '/api/profile/login/init', params, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': baseurl,
		'Referer': baseurl + '/login',
		'X-CSRF-TOKEN': g_csrf
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

    if (json.needConfirmOtp && json.needConfirmOtp == true){
		AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
	
	    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер телефона ' + prefs.login, null, {inputType: 'number', time: 120000});
	
	    var params = [
	        ['name','%2B'+prefs.login],
            ['pwd',prefs.password],
	    	['code',code],
            ['locale','ru_RU'],
	    	['lang','ru-RU']
	    ];
	
	    var html = AnyBalance.requestPost(baseurl + '/api/profile/login/confirm', params, addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/x-www-form-urlencoded',
	    	'Origin': baseurl,
	    	'Referer': baseurl + '/login',
	    	'X-CSRF-TOKEN': g_csrf
	    }));
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
    }
	
	if (json.result != 0){
		var error = json.description;
    	if (error) {
			AnyBalance.trace(html);
    		throw new AnyBalance.Error(error);	
    	}

    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
	var result = {success: true};
	
	AnyBalance.trace ('Получаем данные о владельце...');
	
	html = AnyBalance.requestPost(baseurl + '/api/profile', null, addHeaders({
	        	'Accept': 'application/json, text/plain, */*',
	        	'Content-Type': 'text/plain;charset=UTF-8',
	        	'Origin': baseurl,
	        	'Referer': baseurl + '/products',
	        	'X-CSRF-TOKEN': g_csrf
	        }));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	getParam(json.clientName, result, 'fio', null, null, capitalFirstLetters);
	
	switch(prefs.source){
	case 'card':
        fetchCard(prefs, result);
		break;
    case 'account':
        fetchAccount(prefs, result);
		break;
	case 'auto':
    default:
        fetchCard(prefs, result);
		break;
	}
	
	AnyBalance.setResult(result);
	
}
	
function fetchCard(prefs, result){
	AnyBalance.trace ('Получаем данные по карте...');
	
	var html = AnyBalance.requestGet(baseurl + '/api/card/cards', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var cards = json.cards;
	AnyBalance.trace('Найдено карт: ' + cards.length);
	if(cards.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной карты');

	var currCard;
	for(var i=0; i<cards.length; ++i){
		var card = cards[i];
		AnyBalance.trace('Найдена карта ' + card.number);
		if(!currCard && (!prefs.num || endsWith(card.number, prefs.num))){
			AnyBalance.trace('Выбрана карта ' + card.number);
			currCard = card;
		}
	}

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	
	var cardId = currCard.id;
	
	getParam(card.balance, result, ['balance', 'currency']);
	getParam(g_currency[card.currency]||card.currency, result, 'currency');
	getParam(card.number, result, '__tariff');
	getParam(card.number, result, 'cardnum');
	getParam(card.name, result, 'type');
	getParam(g_statusCard[card.status]||card.status, result, 'status');
	getParam(card.cardHolder, result, 'cardholder');
	getParam(card.expDate.replace(/(\d{4})(\d{2})/,'$2/$1'), result, 'till');
	
	if(AnyBalance.isAvailable('creditlimit'))
	    getParam(card.creditLimit, result, 'creditlimit');
	
}

function fetchAccount(prefs, result){
	AnyBalance.trace ('Получаем данные по счету...');
	
	var html = AnyBalance.requestGet(baseurl + '/api/account/shortDeposits?accountStatusFilter=ALL', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var accounts = json.accounts;
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного счета');

	var currAccount;
	for(var i=0; i<accounts.length; ++i){
		var account = accounts[i];
		AnyBalance.trace('Найден счет ' + account.numberOriginal);
		if(!currAccount && (!prefs.num || endsWith(account.numberOriginal, prefs.num))){
			AnyBalance.trace('Выбран счет ' + account.numberOriginal);
			currAccount = account;
		}
	}

	if(!currAccount)
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
	
	var accountId = currAccount.id;
		
    getParam(account.balance, result, ['balance', 'currency']);
	getParam(g_currency[account.currency]||account.currency, result, 'currency');
	getParam(account.numberOriginal, result, '__tariff');
	getParam(account.numberOriginal, result, 'cardnum');
	getParam(account.name, result, 'type');
	getParam(account.openDate, result, 'opendate');
	getParam(g_statusAcc[account.status]||account.status, result, 'status');
	
}
