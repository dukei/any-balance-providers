/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var baseurl = 'https://ibanking.rosevrobank.ru/ib/site/';

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
		var form = getElement(html, /<form[^>]+name="login"[^>]*>/i);

		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'name')
				return prefs.login;
			if (name == 'password')
				return prefs.password;
			if (name == 'captcha'){
				var img = AnyBalance.requestGet(baseurl + 'login/captcha.jpg', addHeaders({Referer: baseurl}));
				return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
			}
			return value;
		});
		html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="text2"[^>]*>([\s\S]*?)(?:<p[^>]+class="back"[^>]*>|<\/div>)/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /пароль и код пользователя введены правильно/i.test(error));
		
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

    html = AnyBalance.requestGet(baseurl + 'account/list', g_headers);

	var accounts = getElements(html, /<tr[^>]+accountsTable-row[^>]*>/ig);
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var id = getParam(acc, null, null, /accountCode=([^"&]*)/i, replaceHtmlEntities);
		var name = getParam(acc, null, null, /(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var num = getParam(acc, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var cur = getParam(acc, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

		var title = name + ' ' + cur + ' (*' + num.substr(-4) + ')';
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(html, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(html, result, 'accounts.balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['accounts.currency', 'accounts.balance'], /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.blocked', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.available', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var href = getParam(html, null, null, /<a[^>]+href="\/ib\/site\/([^"]*account\/info[^"]*)"/i, replaceHtmlEntities);
    getParam(href, result, 'accounts.type', /accountType=([^"&]*)/i, replaceHtmlEntities); //CURRENT

    if(href && AnyBalance.isAvailable('accounts.pct', 'accounts.comment', 'accounts.date_start', 'accounts.balance_national')){
        html = AnyBalance.requestGet(baseurl + href, g_headers);

        getParam(html, result, 'account.pct', /Годовая процентная ставка:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'account.comment', /Примечание:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'account.date_start', /Дата открытия счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'account.balance_national', /Остаток в национальной валюте:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    if(isAvailable('accounts.transactions')) {
        processAccountTransactions(html, result);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'card/list', g_headers);

	var cardTable = getElement(html, /<table[^>]+id="cardListDataTable"[^>]*>/i);
	if(!cardTable){
        if (/У указанного клиента карт нет/i.test(html)) {
            result.cards = [];
            AnyBalance.trace('Нет ни одной карты.');
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
        return;
	}

	var cards = getElements(cardTable, [/<tr[^>]*>/ig, /cardListAccountTable|cardListDataTable-row/i]);
	AnyBalance.trace('Найдено карт и карточных счетов: ' + cards.length);
	result.cards = [];

    var account = {};
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		if(/cardListAccountTable/i.test(card)){
            //Это счет
            account = {};
            getParam(card, account, 'cards.balance', /Собственные средства:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(card, account, 'cards.blocked', /Заблокировано:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(card, account, 'cards.limit', /Кредитный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(card, account, 'cards.available', /Доступная сумма:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(card, account, 'cards.accnum', /Счет[^<]+(\d{20})/i, replaceTagsAndSpaces);
            getParam(card, account, ['cards.currency', 'cards.balance', 'cards.limit', 'cards.available'], /\d{20}([^<]*)/i, replaceTagsAndSpaces);
		}else{
            var id = getParam(card, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            var name = getParam(card, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

			var c = {__id: id, __name: name + ' (*' + id.substr(-4) + ')', num: id};
            c = joinObjects(c, account);

			if (__shouldProcess('cards', c)) {
				processCard(card, c);
			}

			result.cards.push(c);
		}
	}
}

function processCard(card, result) {
    getParam(card, result, 'cards.type', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.status', /Состояние карты:([^<]*)/i, replaceTagsAndSpaces);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	var html = AnyBalance.requestGet(baseurl + 'contracts/list?confRegParam=Deposit_Reb_Info_Config', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]*class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!list) {
        if (/У указанного клиента контрактов нет/i.test(html)) {
            result.deposits = [];
            AnyBalance.trace('Нет ни одного депозита.');
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с депозитами.');
        }
        return;
	}

    AnyBalance.trace('Получать депозиты пока не умеем.');
    return;

/*	var deposits = sumParam(list, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i){
        var dep = deposits[i];
		var _id = getParam(dep, null, null, /class="txt"[^>]*>\s*([^<]+)/i, replaceTagsAndSpaces);
		var title = getParam(dep, null, null, /class="txt"(?:[^>]*>){5}\s*([^<]+)/i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(dep, c, detailsJson[i]);
		}
		
		result.deposits.push(c);
	}
	*/
}

function processDeposit(html, result, detailsJson) {
/*    getParam(html, result, 'deposits.status', /<td[^>]*CurrentStatus[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(detailsJson.db, result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.db, result, ['deposits.currency', 'deposits.balance'], null, replaceTagsAndSpaces, parseCurrency);
	getParam(detailsJson.dr, result, 'deposits.pct', null, replaceTagsAndSpaces, parseBalance);
	getParam(detailsJson.ac, result, 'deposits.acc_num', null, replaceTagsAndSpaces);
    getParam(detailsJson.ddd, result, 'deposits.period', null, replaceTagsAndSpaces);
    getParam(detailsJson.od, result, 'deposits.date_start', null, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.de, result, 'deposits.date_end', null, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.cap, result, 'deposits.pct_condition');
    getParam(detailsJson.unitcode, result, 'deposits.pct_period');
    getParam(detailsJson.dmil, result, 'deposits.balance_min', null, [replaceTagsAndSpaces, /-|любая/i, 0], parseBalance);
    getParam(detailsJson.dmsi, result, 'deposits.topup_min', null, [replaceTagsAndSpaces, /-|любая/i, 0], parseBalance);
    getParam(detailsJson.dmal, result, 'deposits.balance_max', null, replaceTagsAndSpaces, parseBalance);

    var isTransactionsAvailable = isAvailable('deposits.transactions');
    var dt = new Date();
    var dtFrom = new Date(dt.getFullYear() - (isTransactionsAvailable ? 5 : 0), dt.getMonth(), dt.getDate());

    if(isTransactionsAvailable) {
        var html = AnyBalance.requestGet(baseurl + 'secure/depsops.aspx?id=' + detailsJson.nm + '&df=' + fmtDate(dtFrom) + '&dt=' + fmtDate(dt), addHeaders({'Referer': baseurl + 'secure/accounts.aspx'}));

        if(isAvailable('deposits.transactions'))
            processDepositTransactions(html, result);
    }
*/
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'contracts/list?confRegParam=Credits_Info', g_headers);
	
	var list = getElement(html, /<table[^>]*id="allContracts"[^>]*>/i);
	if(!list){
		if(/У указанного клиента контрактов нет/i.test(html)){
            result.credits = [];
			AnyBalance.trace('Нет ни одного кредита.');
		}else {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти таблицу с кредитами.');
		}
        return;
	}

	var credits = getElements(list, /<tr[^>]*allContracts-row[^>]*>/ig);
	AnyBalance.trace('Найдено кредитов: ' + credits.length);
	result.credits = [];
	
	for(var i=0; i < credits.length; ++i){
		var id = getParam(credits[i], null, null, /'contractCode'\s*:\s*'([^']*)/i, replaceTagsAndSpaces);
		var num = getParam(credits[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(<script|<\/td>)/i, replaceTagsAndSpaces);
        var name = getParam(credits[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: name, num: num};
		
		if(__shouldProcess('credits', c)) {
			processCredit(html, credits[i], c);
		}
		
		result.credits.push(c);
	}
}

function processCredit(page, html, result){
    var _id = result.__id;
    AnyBalance.trace('Обработка кредита ' + _id);

	getParam(html, result, 'credits.limit', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.date_start', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'credits.date_end', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'credits.currency', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'credits.pct', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if (AnyBalance.isAvailable('credits.period', 'credits.penalty', 'credits.minpaytill', 'credits.accnum')) {
        var form = getElement(page, /<form[^>]+id="custContractsList"[^>]*>/i);
        var params = createFormParams(form);
        params.action = 'showContractDetailedInfo';

        var addParams = getParam(html, null, null, /setParams\((\{[\s\S]*?\})\)/i, null, getJsonEval);
        params = joinObjects(addParams, params);

        var action = getParam(form, null, null, /<form[^>]+action="\/ib\/site\/([^"]*)/i, replaceHtmlEntities);
        html = AnyBalance.requestPost(baseurl + action, params, addHeaders({Referer: baseurl}));

        getParam(html, result, 'credits.period', /Срок кредитования в месяцах:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credits.penalty', /Сумма просроченной задолженности:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credits.accnum', /Текущий счет по кредитному договору:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

        //Дата возвращается вроде 25. То есть, надо найти ближайшее следующее 25е число
        var date = getParam(html, null, null, /Дата ежемесячного платежа:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        if (date) {
            var dt = new Date();
            var dt1 = new Date(dt.getFullYear(), dt.getMonth(), date, 12, 59, 59);
            var dt2 = new Date(dt.getFullYear(), dt.getMonth() + 1, date, 12, 59, 59);

            if (dt1.getTime() > dt.getTime())
                getParam(dt1.getTime(), result, 'credits.minpaytill');
            else
                getParam(dt2.getTime(), result, 'credits.minpaytill');
        }
    }
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'fio', /<span[^>]+id="user"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
}
