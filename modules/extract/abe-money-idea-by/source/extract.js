/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
};

var baseurl = 'https://ideabank24.by/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'balanceOverviewPage.xhtml', addHeaders({Referer: baseurl}));

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {

		var form = getElement(html, /<form[^>]+formLogin[^>]*>/i);
		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'formLogin:loginInput')
				return prefs.login;
			if (name == 'formLogin:passwordInput')
				return prefs.password;

			return value;
		});

		params['formLogin:loginBtn'] = '';
		html = AnyBalance.requestPost(baseurl + 'loginPage.xhtml', params, addHeaders({
			Referer: baseurl
		}));

	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+error-summary[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Неверный пароль|не зарегистрирован)/i.test(error));
		
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

	var section = getElement(html, /<div[^>]+card-list/i);
	var table = getElement(section, /<ul[^>]+mainForm:j_idt\d+_list[^>]*>/i);
	var accounts = getElements(table, /<li[^>]+"ui-datalist-item[^>]*>/ig);
	if(!accounts.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти аккаунты. Сайт изменён?");
		return;
	}

	AnyBalance.trace("Найдено счетов: " + accounts.length);
	result.accounts = [];

	for(var i = 0; i < accounts.length; i++) {
	    var acc = accounts[i];
		var num = getParam(acc, /<a[^>]+ui-commandlink[^>]*>\s*№\s*(\d+)/i, replaceTagsAndSpaces);
		var name = getParam(acc, /<a[^>]+ui-commandlink[^>]*>\s*№\s*\d+[\s\S]*?<div[^>]+>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

		var c = {__id: num, __name: name, num: num};

		if (__shouldProcess('accounts', c)) {
			processAccount(acc, c, html);
		}

		result.accounts.push(c);
	}

}

function processAccount(account, result, html) {
	AnyBalance.trace('Обработка счета ' + result.__name);

	var params = processParams(html, account, /<a[^>]+id="([\s\S]*?)"/i);
	if(!params['javax.faces.source']) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти параметры запроса по аккаунту " + result.__name);
		return;
	}

	html = AnyBalance.requestPost(baseurl + 'balanceOverviewPage.xhtml', params, addHeaders({
		Referer: baseurl + 'balanceOverviewPage.xhtml',
		'X-Requested-With': 'XMLHttpRequest',
	}));

	html = AnyBalance.requestGet(baseurl + 'cardAccountDetailsPage.xhtml', addHeaders({
		Referer: baseurl + 'balanceOverviewPage.xhtml',
	}));

	getParam(html, result, 'accounts.balance', /<span[^>]+balance-label[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['accounts.currency', 'accounts.balance'], /<span[^>]+balance-label[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'accounts.date_start', /договор(?:[^>]*>){2}[\s\S]*?(\d+\.\d+\.\d+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'accounts.pct', /процентная ставка(?:[^>]*>){2}([^%]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.cardnum', /<span[^>]+link-text[^>]*><span[^>]+link-text[^>]*>[\s\S]*?(\d{6}\*+\d{4})/i, replaceTagsAndSpaces);

//  Временно не поддерживаем
//	if(isAvailable('accounts.transactions'))
//		processAccountTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var section = getElement(html, /<div[^>]+card-list/i);
	var table = getElement(section, /<ul[^>]+mainForm:j_idt\d+_list[^>]*>/i);
	//Я так поняла, что там к каждому счёту своя карта. В ЛК нет примера отдельных карт
	var accs = getElements(table, /<li[^>]+"ui-datalist-item[^>]*>/ig);
	if(!accs.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти карты. Сайт изменён?"); //link-text span - cards
		return;
	}

	AnyBalance.trace("Найдено счетов с картами:" + accs.length);
	result.cards = [];

	for(var i=0; i < accs.length; ++i){
		var acc = accs[i];
		var cards = getElements(acc, /<li[^>]+ui-datalist-item/ig); //Внутри счета список карт
		var accnum = getParam(acc, /<a[^>]+ui-commandlink[^>]*>\s*№\s*(\d+)/i, replaceTagsAndSpaces);
		AnyBalance.trace('Счет ' + accnum + ': ' + cards.length + ' карт');

		for(var j=0; j<cards.length; ++j){
			var card = cards[j];

			var num = getParam(card, /\d{6}\*{6}\d{4}/);
			var title = getElement(card, /<h1/i, replaceTagsAndSpaces);
	    
			var c = {__id: num, __name: title + ' x' + num.substr(-4), num: num, acc: accnum};
	    
			if (__shouldProcess('cards', c)) {
				processCard(card, c, html);
			}

			result.cards.push(c);
		}

	}
}

function processCard(card, result, html) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	var params = processParams(html, card, /<td[^>]+info-panel[^>]*>[\s\S]*?<a[^>]+id="([^"]*)"/i);
	if(!params['javax.faces.source']) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти параметры запроса по карте " + result.__name);
		return;
	}

	html = AnyBalance.requestPost(baseurl + 'balanceOverviewPage.xhtml', params, addHeaders({
		Referer: baseurl + 'balanceOverviewPage.xhtml',
		'X-Requested-With': 'XMLHttpRequest',
	}));

	html = AnyBalance.requestGet(baseurl + 'cardDetailsPage.xhtml', addHeaders({
		Referer: baseurl + 'balanceOverviewPage.xhtml',
	}));

	getParam(html, result, 'cards.balance', /<span[^>]+balance-label[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.balance'], /<span[^>]ratesLabelCurrencyCode[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.type', /тип карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.till', /Срок действия(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.status', /<span[^>]+class=("[^"]*")[^>]*>[^<]*Карта/i, [replaceTagsAndSpaces, /"ui-state-disabled"/i, 'Неактивна', /""/i, 'Активна']);
	getParam(html, result, 'cards.decure', /<span[^>]+class=("[^"]*")[^>]*>[^<]*3-D Secure/i, [replaceTagsAndSpaces, /"ui-state-disabled"/i, 'Неактивна', /""/i, 'Активна']);
	getParam(html, result, 'cards.SMS', /<span[^>]+class=("[^"]*")[^>]*>[^<]*SMS-информирование/i, [replaceTagsAndSpaces, /"ui-state-disabled"/i, 'Неактивна', /""/i, 'Активна']);

//  Временно не поддерживаем
//	if(isAvailable('cards.transactions'))
//		processCardTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

	var section = getElement(html, /<div[^>]+deposit-list/i);
	var table = getElement(section, /<ul[^>]+mainForm:j_idt\d+_list[^>]*>/i);
	var deposits = getElements(table, /<li[^>]+"ui-datalist-item[^>]*>/ig);
	if(!deposits.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти депозиты.");
		return;
	}

	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	

	for(var i=0; i < deposits.length; ++i){
	    var dep = deposits[i];
		var id = getParam(dep, /Договор[^\d]*(\d+)/i, replaceTagsAndSpaces);
		var num = getParam(dep, /Договор[^\d]*(\d+)/i, replaceTagsAndSpaces);
		var title = getParam(dep, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(dep, c, html);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(deposit, result, html) {
    AnyBalance.trace('Обработка депозита ' + result.__name);


	var params = processParams(html, deposit, /<li[^>]+datalist[^>]*>[\s\S]*?<a[^>]+id="([^"]*)"/i);
	if(!params['javax.faces.source']) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти параметры запроса по депозиту " + result.__name);
		return;
	}

	html = AnyBalance.requestPost(baseurl + 'balanceOverviewPage.xhtml', params, addHeaders({
		Referer: baseurl + 'balanceOverviewPage.xhtml',
		'X-Requested-With': 'XMLHttpRequest',
	}));

	html = AnyBalance.requestGet(baseurl + 'depositDetailsPage.xhtml', addHeaders({
		Referer: baseurl + 'balanceOverviewPage.xhtml',
	}));


	getParam(html, result, 'deposits.balance', /<span[^>]+balance-label[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.profit', /доходность(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['deposits.currency', 'deposits.balance', 'deposits.profit'], /доходность(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'deposits.date_start', /договор[\s\S]*?от\s*(\d+\.\d+\.\d+)\s*<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'deposits.pct', /процентная ставка(?:[^>]*>){4}([^%]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.pctClose', /Ставка расторжения(?:[^>]*>){4}([^%]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.duration', /Продолжительность(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.pct_condition', /Выплата процентов(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.capitalization', /Капитализация(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.withdraw', /Частичное снятие(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.topup', /Пополнение(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.prolong', /Автопролонгация(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.revocation', /Отзыв депозита(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

//  Временно не поддерживаем
//    if(isAvailable('deposits.transactions'))
//        processDepositTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<label[^>]+user-name[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
}

function processParams (html, product, prodRegExp) {
	var form = getElement(html, /<form[^>]+mainform[^>]*>/i);
	var params = createFormParams(form, function(params, str, name, value) {
		return value;
	});

	var actionForm = getParam(product || html, prodRegExp);

	params['javax.faces.partial.ajax'] = true;
	params['javax.faces.partial.execute'] = '@all';
	params['javax.faces.source'] = actionForm;
	params[actionForm] = actionForm;

	return params;

}