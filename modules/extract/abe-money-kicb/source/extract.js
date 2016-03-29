/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':						'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':		'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':				'keep-alive',
	'User-Agent':				'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36'
};

var baseurl = 'https://ibank.kicb.net/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setCookie('ibank.kicb.net', 'ibank_kicb_lang', 'RUS');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'main.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/exit/i.test(html)) {
		var form = getElement(html, /<form[^>]+name="form1"[^>]*>/i);

		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'txtLogin') {
				return prefs.login;
			} else if (name == 'txtPass') {
				return prefs.password;
			}
				return value;
			});

		html = AnyBalance.requestPost(baseurl + 'Login.aspx', params, addHeaders({
			Referer: baseurl
		}));
	} else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/exit/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+msg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверно указан логин или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

    __setLoginSuccessful();

	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(baseurl + 'cards_and_accounts.aspx', g_headers);

		var table 	 = getElement(html, /<a[^>]*>Мои счета<\/a>[\s\S]*?(<table[^>]*>)/i);
		var accounts = getElements(table, /<tr[^>]*>/ig);
		if(!accounts.length){
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти счета.');
			return;
		}

		AnyBalance.trace('Найдено счетов: ' + (accounts.length - 1));
		result.accounts = [];

		for(var i = 1; i < accounts.length; ++i){
			var id 		= getParam(accounts[i], null, null, /<tr(?:[^>]*>){6}([^<]*)/i);
			var num 	= getParam(accounts[i], null, null, /<tr(?:[^>]*>){6}([^<]*)/i);
			var title = getParam(accounts[i], null, null, /<tr(?:[^>]*>){3}([^<]*)/i) + ' ' + num;

			var c = {__id: id, __name: title, num: num};

			if(__shouldProcess('accounts', c)) {
				processAccount(accounts[i], c);
			}

			result.accounts.push(c);
		}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(account, result, 'accounts.balance', /<tr(?:[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, parseBalance);  //текущий остаток
    getParam(account, result, 'accounts.available', /<tr(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseBalance); //Доступная сумма
    getParam(account, result, ['accounts.currency', 'accounts.balance', 'accounts.available'], /<tr(?:[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
		getParam(account, result, 'accounts.last_operation_date', /<tr(?:[^>]*>){12}([^<]*)/i, replaceTagsAndSpaces, parseDate); //Дата последней операции

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(baseurl + 'cards_and_accounts.aspx', g_headers);

	var table = getElement(html, /<a[^>]*>Мои карты<\/a>[\s\S]*?(<table[^>]*>)/i);
	var cards = getElements(table, /<tr[^>]*>/ig);
	if(!cards.length){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти карты.');
		return;
	}

	AnyBalance.trace('Найдено карт: ' + (cards.length - 1));
	result.cards = [];

	for(var i = 1; i < cards.length; ++i){
		var id 		= getParam(cards[i], null, null, /<tr(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces);
		var num 	= getParam(cards[i], null, null, /<tr(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces);
		var title = getParam(cards[i], null, null, /<tr(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

		var account  = getParam(card, null, null, /getavailablebalance(?:[^']*'){3}([^']*)/i),
				currency = getParam(card, null, null, /getavailablebalance(?:[^']*'){5}([^']*)/i),
				culture  = getParam(card, null, null, /getavailablebalance(?:[^']*'){7}([^']*)/i),
				limit 	 = getParam(card, null, null, /getavailablebalance(?:[^']*'){9}([^']*)/i);

		var html = AnyBalance.requestGet(baseurl + 'CommonHandler.ashx?request=CardBalance&account=' + account + '&currency=' + currency + '&credit_limit=' + limit + '&culture=' + culture, g_headers);
		var json = getJson(html);

		getParam(json.value + '', result, 'cards.balance', null, null, parseBalance);
		getParam(account,  				result, 'cards.accnum');
		getParam(currency, 				result, 'cards.currency');

		if(isAvailable('cards.transactions')) {
			processCardTransactions(result);
		}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
		throw new AnyBalance.Error("Обработка депозитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
		throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.")
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<span[^>]+ClientName[^>]*>([^<]*)/i, replaceTagsAndSpaces);
}