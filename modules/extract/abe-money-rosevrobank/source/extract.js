/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0',
};

var baseurl = 'https://vb.rosevrobank.ru/';

var g_Xml_Headers = addHeaders({
	'X-Requested-With': 'XMLHttpRequest',
	'Wicket-Ajax': 'true',
	'Wicket-Ajax-BaseURL': '/',
	Referer: baseurl,
});

function redirectAsRequested(html, error){
	var redir = getElement(html, /<redirect/i);
	if(!redir){
		var errorText = getElement(html, /<[^>]+feedbackPanel/i, replaceTagsAndSpaces);
		if(errorText)
			throw new AnyBalance.Error(errorText, null, /парол/i.test(errorText));
		AnyBalance.trace(html);
		throw new AnyBalance.Error(error || 'Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	var url = getParam(redir, /<!\[CDATA\[([\s\S]*?)\]\]>/i);
	AnyBalance.trace('Редирект на ' + url);

	html = AnyBalance.requestGet(url, addHeaders({
		Referer: baseurl
	}));

	return html;
}

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'office', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
		var form = getElement(html, /<div[^>]+loginPopupContent/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		}
			

		var params = createFormParams(form, function(params, str, name, value) {
			if (/username/i.test(name))
				return prefs.login;
			if (/password/i.test(name))
				return prefs.password;
			return value;
		});

		var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		html = AnyBalance.requestPost(joinUrl(baseurl, action), params, g_Xml_Headers);

		html = redirectAsRequested(html, 'Не удалось зайти в интернет-банк. Сайт изменен?');

		form = getElements(html, [/<form/ig, /:smsCode/i])[0];
		if(form){
			AnyBalance.trace('Потребовался ввод смс-кода');
			action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
			var params = createFormParams(form, function(params, str, name, value) {
				if (/:smsCode:smsCode/i.test(name))
					return AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения в интернет-банк, отправленный вам в SMS', null, {inputType: 'number', time: 180000});
				return value;
			});

			html = AnyBalance.requestPost(joinUrl(baseurl, action), params, g_Xml_Headers);
			if(!html)
				throw new AnyBalance.Error('Неверно введен код');
			
			html = redirectAsRequested(html, 'Не удалось зайти в интернет-банк после ввода кода. Сайт изменен?');
		}
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var errorText = getElement(html, /<[^>]+feedbackPanel/i, replaceTagsAndSpaces);
		if(errorText)
			throw new AnyBalance.Error(errorText, null, /парол/i.test(errorText));
		
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

	var html = AnyBalance.requestGet(baseurl + 'office/accounts', g_headers);

	var accounts = getElements(html, /<div[^>]+productShortInfo[^>]+\baccount\b/ig);

	if(!accounts.length){
        if (/Действующих счетов нет/i.test(html)) { //Действующих счетов нет
            result.accounts = [];
            AnyBalance.trace('Нет ни одного счета.');
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу со счетами.');
        }
        return;
	}
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);

	throw new AnyBalance.Error('Получение счетов пока не поддерживается. Пожалуйста, обратитесь к разработчикам');

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

	var html = AnyBalance.requestGet(baseurl + 'office/cards', g_headers);

	var cards = getElements(html, /<div[^>]+productShortInfo[^>]+\bcard\b/ig);

	if(!cards.length){
        if (/Действующих карт нет/i.test(html)) { //Действующих счетов нет
            result.cards = [];
            AnyBalance.trace('Нет ни одной карты.');
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
        return;
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	var wickets = findWicketActions(html);

	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var id = getParam(card, /office\/cards\/(\d+)\/statement/i);
        var num = getElement(card, /<label/i, replaceTagsAndSpaces);
        var name = getElement(card, /<h\d/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: name + ' (*' + num.substr(-4) + ')', num: num};

		if (__shouldProcess('cards', c)) {
			processCard(card, c, wickets);
		}

		result.cards.push(c);
	}
}

function processCard(card, result, wickets) {
	getParam(card, result, 'cards.balance', /<div[^>]+formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.currency', /<div[^>]+formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(card, result, 'cards.name', /<h\d[^>]*>([\s\S]*?)<\/h\d>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('cards.available', 'cards.kind', 'cards.type', 'cards.status', 'cards.accnum', 'cards.holder', 'cards.pct', 'cards.till', 'cards.debt', 'cards.transactions')){
        var html = AnyBalance.requestGet(baseurl + 'office/cards/' + result.__id, g_headers);
	    
        getParam(html, result, 'cards.type', /Тип карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.kind', /Вид карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.available', /Доступный лимит(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.accnum', /Счет карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.status', /Статус(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.holder', /Имя на карте(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.pct', /Проценты на остаток(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.till', /Действует до(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'cards.debt', /Общая сумма задолженности(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

        if(AnyBalance.isAvailable('cards.transactions')){
			var cardUrl = AnyBalance.getLastUrl();
        	processCardTransactions(cardUrl, result);
        }
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	var html = AnyBalance.requestGet(baseurl + 'office/deposits', g_headers);

	var accounts = getElements(html, /<div[^>]+productShortInfo[^>]+\bdeposit\b/ig);

	if(!accounts.length){
        if (/Действующих вкладов нет/i.test(html)) { //Действующих счетов нет
            result.deposits = [];
            AnyBalance.trace('Нет ни одного вклада.');
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу со вкладами.');
        }
        return;
	}
	
	AnyBalance.trace('Найдено вкладов: ' + accounts.length);

	throw new AnyBalance.Error('Получение вкладов пока не поддерживается. Пожалуйста, обратитесь к разработчикам');

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

	var html = AnyBalance.requestGet(baseurl + 'office/loans', g_headers);

	var accounts = getElements(html, /<div[^>]+productShortInfo[^>]+\bloan\b/ig);

	if(!accounts.length){
        if (/Действующих кредитов нет/i.test(html)) { //Действующих счетов нет
            result.credits = [];
            AnyBalance.trace('Нет ни одного кредита.');
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу со кредитами.');
        }
        return;
	}
	
	AnyBalance.trace('Найдено кредитов: ' + accounts.length);

	throw new AnyBalance.Error('Получение кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам');

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
	if(!AnyBalance.isAvailable('info'))
		return;

    var info = result.info = {};
    html = AnyBalance.requestGet(baseurl + 'office/profile', g_headers);
    
    var removeLabel = [/<label[^>]*>([\s\S]*?)<\/label>/ig, '', /<a[^>]+actionEdit[^>]*>([\s\S]*?)<\/a>/ig, '', replaceTagsAndSpaces];

    getParam(getElement(html, /<div[^>]+fullName/i, removeLabel), info, 'info.fio');
    getParam(getElement(html, /<div[^>]+mobilePhone/i, removeLabel), info, 'info.mphone');
    getParam(getElement(html, /<div[^>]+additionalPhone/i, removeLabel), info, 'info.aphone');
    getParam(getElement(html, /<div[^>]+eMail/i, removeLabel), info, 'info.email');

    getParam(html, info, 'info.passport', /<label[^>]*>\s*Паспорт[\s\S]*?<div[^>]+editInPlaceField[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.inn', /<label[^>]*>\s*ИНН[\s\S]*?<div[^>]+editInPlaceField[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.snils', /<label[^>]*>\s*СНИЛС[\s\S]*?<div[^>]+editInPlaceField[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
}

// Wicket-ajax actions search
function findWicketActions(html) {
	var actions = sumParam(html, null, null, /Wicket.Ajax.ajax\((\{[\s\S]*?\})\);/ig) || [];
	AnyBalance.trace('Found ' + actions.length + ' Wicket-ajax actions');
	return actions;
}

function findExactWickeAction(actions, exactId) {
	if(!actions)
		return;
	
	for(var i=0; i< actions.length; i++) {
		var json = getJsonEval(actions[i]);
		var url = (json.u || '').replace(/^.\/main/, 'main').replace(/;jsessionid[^?]+/i, '');
		
		if(json.c === exactId)
			return url;		
	}
}

function requestGetWicketAction(html, regex, params, wicketsOrHtml) {
	var wicketId = getParam(html, null, null, regex);
	if(!wicketId){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не нашли wicketId ' + regex.source);
	}
	
	var actions = wicketsOrHtml ? (Array.isArray(wicketsOrHtml) ? wicketsOrHtml : findWicketActions(wicketsOrHtml)) : findWicketActions(html);

	var action = findExactWickeAction(actions, wicketId);
	if(!action)
		throw new AnyBalance.Error('Не удалось найти action: ' + wicketId);

   	return executeWicketUrl(action, params);
}

function executeWicketUrl(url, params){
	return params ? 
		AnyBalance.requestPost(joinUrl(baseurl, url), params, g_Xml_Headers) :
		AnyBalance.requestGet(joinUrl(baseurl, url) + '&_=' + new Date().getTime(), g_Xml_Headers);
}

