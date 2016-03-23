/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.360'
};

var baseurl = 'https://online.openbank.ru/';

function getToken(html) {
	return getParam(html, null, null, /name="__RequestVerificationToken"[^>]+value="([^"]+)/i);
}

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logOff/i.test(html)) {
		var form = getElement(html, /<form[^>]+formAuth[^>]*>/i);

		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'UserNameFromHidden')
				return prefs.login;
			if (name == 'PasswordFromHidden')
				return prefs.password;
			return value;
		});

		if(/<input[^>]+id="captcha"[^>]*>/i.test(html)) {
			var captchaSRC = getParam(html, null, null, /<img[^>]+src="([^"]*)"[^>]+captcha[^>]*>/i);
			if(!captchaSRC) {
				throw new AnyBalance.Error("Не удалось найти ссылку на капчу. Сайт изменён?");
			}

			var captchaIMG = AnyBalance.requestGet(baseurl+captchaSRC, g_headers);
			params['captcha'] = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captchaIMG);
			params['captcha-guid'] = getParam(html, null, null, /<input[^>]+captcha-guid[^>]+value="([^"]*)/i);
		}

		html = AnyBalance.requestPost(baseurl + 'LogOn', params, addHeaders({
			Referer: baseurl + 'logon'
		}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}


	if (!/logOff/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+validator error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /(пароль неправильный|cимволы введены неверно)/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'Finances/index', g_headers);

    __setLoginSuccessful();
	
	return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	var table = getParam(html, null, null, /<a[^>]*>Счета[\s\S]*?(<table[^>]+"info"[^>]*>[\s\S]*?<\/table>)/i);
	var accounts = getElements(table, /<tr[^>]*>/ig);
	if(!accounts.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти счета.");
		return;
	}

	AnyBalance.trace("Найдено счетов: " + accounts.length);
	result.accounts = [];

	for(var i = 0; i < accounts.length; i++) {
		var id = getParam(accounts[i], null, null, /номер счета\s*([^<]*)/i);
		var num = getParam(accounts[i], null, null, /номер счета\s*([^<]*)/i);
		var title = getParam(accounts[i], null, null, /<span[^>]+name_card[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('accounts', c)) {
			processAccount(accounts[i], c);
		}

		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__id);

	var href = getParam(account, null, null, /location\.href\s*=\s*['"]\/?([^'"]*)/i);
	if(!href) {
		AnyBalance.trace(account);
		AnyBalance.trace("Не удалось найти ссылку на выписку по счету" + result.__id);
		return;
	}

	var html = AnyBalance.requestGet(baseurl + href, g_headers);

	getParam(html, result, 'accounts.incomingBalance', /Входящий остаток(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.blocked', /Заблокировано(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.balance', /<td[^>]*>\s*остаток(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.available', /доступно на(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['accounts.currency', 'accounts.available', 'accounts.balance', 'accounts.incomingBalance', 'accounts.blocked'], /Входящий остаток(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(href, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var table = getElement(html, /<table[^>]+info cards-grid[^>]*>/i);
	var cards = getElements(table, /<tr[^>]*>/ig);
	if(!cards.length){
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти карты.");
		return;
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var id = getParam(cards[i], null, null, /<span[^>]+nomber_card[^>]*>[^]*(\d{4}[*\s]+\d{4})/i);
		var num = getParam(cards[i], null, null, /<span[^>]+nomber_card[^>]*>[^]*(\d{4}[*\s]+\d{4})/i, replaceTagsAndSpaces);
		var title = getParam(cards[i], null, null, /<a[^*>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	var href = getParam(card, null, null, /location\.href\s*=\s*['"]\/?([^'"]*)/i);
	if(!href) {
		AnyBalance.trace(card);
		AnyBalance.trace("Не удалось найти ссылку на выписку по карте " + result.__id);
		return;
	}

	var html = AnyBalance.requestGet(baseurl + href, g_headers);

	getParam(html, result, 'cards.accnum', /Номер счета:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.till', /Карта действительна до:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.status', /Статус карты:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.balance', /Доступно на(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.limit', /Кредитный лимит:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.debt', /Размер задолженности:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.accuredPct', /Начисленные проценты(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.paySum', /Сумма очередного платежа(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.blocked', /Заблокировано:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.overduePct', /штрафы(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.balance', 'cards.limit', 'cards.debt', 'cards.oPCT', 'cards.accuredPct', 'cards.overduePct', 'cards.paySum', 'cards.blocked'], /Доступно на(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'cards.__tariff', /Карточный тариф(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.payDate', /Дата следующего платежа(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

	if(isAvailable('cards.transactions')) {
		processCardTransactions(href, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

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

	var href = getParam(deposit, null, null, /location\.href\s*=\s*['"]\/?([^'"]*)/i);
	if(!href) {
		AnyBalance.trace(deposit);
		AnyBalance.trace("Не удалось найти ссылку на выписку по депозиту" + result.__name);
		return;
	}

	var html = AnyBalance.requestGet(baseurl + href, g_headers);

	getParam(html, result, 'deposits.balance', /остаток на(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.pct', /Ставка:(?:[^>]*>){1}([^%]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['deposits.currency', 'deposits.balance'], /остаток на(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'deposits.accnum', /Номер счета(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.agreement', /Договор(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.status', /Статус(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.till', /остаток на(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'deposits.date_start', /Дата открытия(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

	if(isAvailable('deposits.transactions')) {
		processDepositTransactions(href, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error("Обработка кредитов на данный момент не поддерживается. Пожалуйста, обратитесь к разработчику.");
}
function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<div[^>]+hello([^>]*>){5}/i, replaceTagsAndSpaces);
}
