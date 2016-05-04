/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':					'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':			'keep-alive',
	'User-Agent':			'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
};

var baseurl = 'https://ibank.cbk.kg/portal/';

function login() {
		var prefs = AnyBalance.getPreferences();

		AnyBalance.setDefaultCharset('utf-8');

		checkEmpty(prefs.login, 'Введите логин!');
		checkEmpty(prefs.password, 'Введите пароль!');

		var html = AnyBalance.requestGet(baseurl + 'consumer/home', g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
		}

		if (!/logoutLink/i.test(html)) {
			var x = getParam(html, null, null, /<form[^>]+id1[^>]+action="([^"]*)/i);

			html = AnyBalance.requestPost(baseurl + 'login' + x, {
				id5_hf_0: '',
				username: prefs.login,
				password: prefs.password,
			}, addHeaders({
				Referer: baseurl + 'login'
			}));
		}else{
			AnyBalance.trace('Уже залогинены, используем существующую сессию')
		}

		if (!/logoutLink/i.test(html)) {
			var error = getParam(html, null, null, /<span[^>]+feedbackPanelERROR[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /проверьте логин и пароль/i.test(error));

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

    html = AnyBalance.requestGet(baseurl + 'consumer/accounts', g_headers);

		//Второй раз запрос отправлять не будем, т.к. тогда всё становится ещё хуже.
		if(/Произошла непредвиденная ошибка/i.test(html)) {
			AnyBalance.trace("Не удалось загрузить данные с первого раза. В ЛК произошла непредвиденная ошибка. Попробуйте обновить данные провайдера, если баланс не отображается.");
		}

		var table 	 = getElement(html, /<h2[^>]*>\s*Счета[\s\S]*?(<table[^>]*>)/i);
		var accounts = getElements(table, /<tr[^>]+(?:even|odd)[^>]*>/ig);
		if(!accounts.length){
			AnyBalance.trace(html);
			AnyBalance.trace("Не удалось найти счета.")
			return;
		}
	
		AnyBalance.trace('Найдено счетов: ' + accounts.length);
		result.accounts = [];

		for(var i=0; i < accounts.length; ++i){
			var id	 	= getParam(accounts[i], null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			var num 	= getParam(accounts[i], null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			var title = getParam(accounts[i], null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

			var c = {__id: id, __name: title, num: num};

			if(__shouldProcess('accounts', c)) {
				processAccount(accounts[i], c);
			}

			result.accounts.push(c);
		}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account, result, 'accounts.type', 				/<tr[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(account, result, 'accounts.status', 			/<tr[^>]*>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(account, result, 'accounts.balance', 		/<tr[^>]*>(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, 'accounts.balance_acc', /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, 'accounts.limit', 			/<tr[^>]*>(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(account, result, 'accounts.currency',     /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){5}([^\d]*)/i,        replaceTagsAndSpaces);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
		if(!AnyBalance.isAvailable('cards'))
			return;

		html = AnyBalance.requestGet(baseurl + 'consumer/accounts', g_headers);

		var table 	 = getElement(html, /<h2[^>]*>\s*Банковские карты[\s\S]*?(<tbody[^>]*>)/i);
		var cards = getElements(table, /<tr[^>]*>/ig);
		if(!cards.length){
			AnyBalance.trace(html);
			AnyBalance.trace("Не удалось найти карты.")
			return;
		}

		AnyBalance.trace('Найдено карт: ' + cards.length);
		result.cards = [];

		for(var i=0; i < cards.length; ++i){
			var card = cards[i];
			var id 		= getParam(cards[i], null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			var num 	= getParam(cards[i], null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			var title = getParam(cards[i], null, null, /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

			var c = {__id: id, __name: title, num: num};

			if (__shouldProcess('cards', c)) {
				processCard(card, c);
			}

			result.cards.push(c);
		}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

		//У карт только статус, название, тип и номер. Хоп-хэй
    getParam(card, result, 'cards.status', /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.type', /<tr[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
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
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<span[^>]+topmenulabel(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);
}
