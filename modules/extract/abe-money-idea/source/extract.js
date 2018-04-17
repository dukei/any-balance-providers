/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
};

var baseurl = 'https://ideaonline.ua/';
var postKey;

 function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'Pages/Security/LogOn.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
		var form = getElement(html, /<form[^>]+name="aspnetform"[^>]*>/i);
		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'ctl00$body$ContentBody$wzLogin$tbLogin')
				return prefs.login;
			if (name == 'ctl00$body$ContentBody$wzLogin$tbPassword')
				return prefs.password;

			return value;
		});

		params.__EVENTTARGET = getParam(form, null, null, /<a[^>]+class="submit"[^>]+postbackoptions\(([\s\S]*?),/i, [/&quot;/g, '']);
		if(!params.__EVENTTARGET) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error("Не удалось найти параметр авторизации. Сайт изменён?");
		}

		html = AnyBalance.requestPost(baseurl + 'Pages/Security/LogOn.aspx', params, addHeaders({
			Referer: baseurl + 'Pages/Security/LogOn.aspx?'
		}));
	} else {
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+vlsummarylogin[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверные логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	 postKey = getParam(html, null, null, /<input[^>]+responsetoken[^>]+value="([\s\S]*?)"/i);
	 if(!postKey) {
		 AnyBalance.trace(html);
		 throw new AnyBalance.Error("Не удалось найти параметр запроса. Сайт изменён?");
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

    html = AnyBalance.requestGet(baseurl + 'Pages/Account/MyAccounts.aspx?postkey=' + postKey, g_headers);

	var table = getElement(html, /<table[^>]+gvAccounts[^>]*>/i);
	var accounts = getElements(table, /<tr[^>]*>/ig);
	if(!accounts.length || accounts.length == 1){
		if(/(Нет счетов|Немає рахункiв|No accounts)/i.test(html)){
			AnyBalance.trace('У вас нет счетов');
			result.accounts = [];
		}else {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти ни одного счета.');
		}
		return;
	}

	AnyBalance.trace('Найдено счетов: ' + (accounts.length - 1));
	result.accounts = [];


	for(var i=1; i < accounts.length; ++i){
		var id = getParam(accounts[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<span/i, replaceTagsAndSpaces);
		var num = getParam(accounts[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<span/i, replaceTagsAndSpaces);
		var title = getParam(accounts[i], null, null, /<a[^>]+accountname[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if(__shouldProcess('accounts', c)) {
			processAccount(html, accounts[i], c);
			//Это нужно, чтобы обновить параметры для следующего запроса. Возврат на общую страницу аккаунтов.
			html = AnyBalance.requestGet(baseurl + 'Pages/Account/MyAccounts.aspx?postkey=' + postKey, addHeaders({
				Referer: baseurl + 'Pages/Account/MyAccounts.aspx?postkey=' + postKey
			}));
		}
		result.accounts.push(c);
	}

	//После того как закончили обработку данных, нужно забрать параметр для перехода на след. страницу (карты/депозиты/кредиты)
	postKey = getParam(html, null, null, /<input[^>]+responsetoken[^>]+value="([\s\S]*?)"/i);

}

function processAccount(html, account, result){
    AnyBalance.trace('Обработка счета ' + result.__id);

	//Параметры всегда меняются. Надо получать каждый раз.
	var params = getParamByName(html, [
		'__EVENTARGUMENT',
		'__EVENTVALIDATION',
		'__VIEWSTATE',
		'__VIEWSTATEENCRYPTED',
		'__VIEWSTATEGENERATOR'
	]);

	params.__EVENTTARGET = getParam(account, null, null, /<a[^>]+dopostback\(([\s\S]*?),/i, [/(&#39;)/g, '']);
	if(!params.__EVENTTARGET) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти параметр запроса для обработки карты.");
		return;
	}

	html = AnyBalance.requestPost(baseurl + 'Pages/Account/MyAccounts.aspx?postkey=' + postKey, params, addHeaders({
		Referer: baseurl + 'Pages/Account/MyAccounts.aspx?postkey=' + postKey,
	}));

	getParam(html, result, 'accounts.additionalAgreement', /<span[^>]+rffAdditionalAgreement[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.agreement', /<span[^>]+rffagreement[^>]*>№\s*([^\s]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.agreementDate', /<span[^>]+rffagreement[^>]*>[\s\S]*?(\d{2}\.\d{2}\.\d{4})<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.product', /<span[^>]+lffproductName[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.branch', /<span[^>]+rffBranch[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	getParam(html, result, 'accounts.balance', /<span[^>]+rffBalance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.availableBalance', /<span[^>]+rffAvailableFunds[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['accounts.currency' , 'accounts.balance', 'accounts.AvailableBalance'], /<span[^>]+rffBalance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);

	if(AnyBalance.isAvailable('accounts.transactions')) {
	   processAccountTransactions(html, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(baseurl + 'Pages/Card/MyCards.aspx?postkey=' + postKey, g_headers);

	var cardList = getElements(html, /<table[^>]+gvcards[^>]*>/ig);
	if(!cardList.length){
        if(/У вас нет карт/i.test(html)){
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
		return;
	}

	AnyBalance.trace('Найдено карт: ' + cardList.length);
	result.cards = [];

	for(var i=0; i < cardList.length; ++i){
		var card = cardList[i];
		var id = getParam(card, null, null, /(?:[\s\S]*?<tr[^>]*>){2}(?:[^>]*>){6}([\s\S]*?)<\//i);
		var num = getParam(card, null, null, /(?:[\s\S]*?<tr[^>]*>){2}(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		var title = getParam(card, null, null, /(?:[\s\S]*?<tr[^>]*>){2}(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(html, card, c);

			html = AnyBalance.requestGet(baseurl + 'Pages/Card/MyCards.aspx?postkey=' + postKey, addHeaders({
				Referer: baseurl + 'Pages/Card/MyCards.aspx?postkey=' + postKey
			}));
		}

		result.cards.push(c);
	}

	postKey = getParam(html, null, null, /<input[^>]+responsetoken[^>]+value="([\s\S]*?)"/i);
}

function processCard(html, card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(card, result, 'cards.status', /<td[^>]+columnstatus[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(card, result, 'cards.till', /<td[^>]+columndate[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseDateWord);

	var params = getParamByName(html, ['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__VIEWSTATEENCRYPTED', '__EVENTVALIDATION']);
	params.__EVENTTARGET = getParam(card, null, null, /<a[^>]+dopostback\(([\s\S]*?),/i, [/(&#39;)/g, '']);
	params.__EVENTARGUMENT = getParam(card, null, null, /<a[^>]+,([\s\S]*?)\)/i, [/(&#39;)/g, '']);

	if(!params.__EVENTARGUMENT || !params.__EVENTTARGET) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти параметр запроса подробной информации о карте.");
		return;
	}

	var html = AnyBalance.requestPost(baseurl + 'Pages/Card/MyCards.aspx?postkey=' + postKey, params, addHeaders({
		Referer: 'Pages/Card/MyCards.aspx?postkey=' + postKey
	}));

	getParam(html, result, 'cards.sign', /<span[^>]+lffFeature[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.type', /<span[^>]+lffCardType[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.kind', /<span[^>]+lffCardKind[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.toAcc', /<a[^>]+rffAccount[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.accOwner', /<span[^>]+lffaccountowner[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.cardholder', /<span[^>]+lffCardholder[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	if(isAvailable('cards.transactions'))
		processCardTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

	html = AnyBalance.requestGet(baseurl + 'Pages/Deposit/MyDeposits.aspx?postkey=' + postKey, g_headers);

	var table = getElement(html, /<table[^>]+gvdeposits[^>]*>/i);
	var deposits = getElements(table, /<tr[^>]*>/ig);
	if(!deposits.length || deposits.length == 1){
		if(/(Немає депозитiв|Нет депозитов|No deposit)/i.test(html)){
			AnyBalance.trace('У вас нет депозитов');
			result.deposits = [];
		}else {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти таблицу с депозитами.');
		}
		return;
	}

	AnyBalance.trace('Найдено депозитов: ' + (deposits.length - 1));
	result.deposits = [];

	for(var i=1; i < deposits.length; ++i){

		var title = getParam(deposits[i], null, null, /<td[^>]+ltext[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		//В таблице не указаны номер депозита. Получаем полную информацию по депозитору
		var params = getParamByName(html, ['__EVENTARGUMENT', '__VIEWSTATE', '__VIEWSTATEGENERATOR', '__VIEWSTATEENCRYPTED', '__EVENTVALIDATION']);
		params.__EVENTTARGET = getParam(deposits[i], null, null, /<a[^>]+dopostback\(([\s\S]*?),/i, [/(&#39;)/g, '']);
		if(!params.__EVENTTARGET) {
			AnyBalance.trace(html);
			AnyBalance.trace("Не удалось найти параметр запроса для обработки депозита.");
			continue;
		}
		html = AnyBalance.requestPost(baseurl + 'Pages/Deposit/MyDeposits.aspx?postkey=' + postKey, params, addHeaders({
			Referer: baseurl + 'Pages/Deposit/MyDeposits.aspx?postkey=' + postKey
		}));


		var id = getParam(html, null, null,/<span[^>]+rffDepositAccountNumber[^>]*>([\s\S]*?)<\/span>/i);
		var num = getParam(html, null, null,/<span[^>]+rffDepositAccountNumber[^>]*>([\s\S]*?)<\/span>/i);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('deposits', c)) {
			processDeposit(html, deposits[i], c);

			html = AnyBalance.requestGet(baseurl + 'Pages/Deposit/MyDeposits.aspx?postkey=' + postKey, addHeaders({
				Referer: baseurl + 'Pages/Deposit/MyDeposits.aspx?postkey=' + postKey
			}));
		}

		result.deposits.push(c);
	}

	postKey = getParam(html, null, null, /<input[^>]+responsetoken[^>]+value="([\s\S]*?)"/i);
}

function processDeposit(html, deposit, result) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

	getParam(deposit, result, 'deposits.date_start', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(deposit, result, 'deposits.till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)</i, replaceTagsAndSpaces);

	getParam(html, result, 'deposits.pct', /<span[^>]+lffInterestRateActual[^>]*>[^\%]*\%/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.pctStart', /<span[^>]+rffInterestRate[^>]*>[^\%]*\%/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.pctClose', /<span[^>]+lffInterestRateTerminate[^>]*>[^\%]*\%/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.pct_condition', /<span[^>]+rffInterestsPayment[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.prolong', /<span[^>]+rffProlongation[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.accPct', /<span[^>]+rffReturnAccount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.topup', /<span[^>]+rffReplenishment[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.withdraw', /<span[^>]+rffWithdrawal[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.capitalization', /<span[^>]+rffCapitalization[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.agreement', /<span[^>]+rffagreement[^>]*>№\s*([^\s]*)/i, replaceTagsAndSpaces);

	getParam(html, result, 'deposits.balance', /<span[^>]+rffAmount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(html, result, 'deposits.balance_min', /<span[^>]+lffMinAmount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(html, result, 'deposits.balance_max', /<span[^>]+lffMaxAmount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(html, result, 'deposits.profit', /<span[^>]+rffProfit[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(html, result, ['deposits.currency', 'deposits.balance', 'deposits.balance_min', 'deposits.balance_max', 'deposits.profit'], /<span[^>]+rffAmount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);


    if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error('Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.');
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<div[^>]+barname[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

	postKey = getParam(html, null, null, /<input[^>]+responsetoken[^>]+value="([\s\S]*?)"/i);
}

function getParamByName(html, names) {
	names = isArray(names) ? names : [names];
	var params = {};
	for(var i = 0; i < names.length; i++) {
		params[names[i]] = getParam(html, null, null, new RegExp('name=["\']' + names[i] + '["\'][^>]*value=["\']([^"\']+)"', 'i')) || '';
	}
	return params;
}