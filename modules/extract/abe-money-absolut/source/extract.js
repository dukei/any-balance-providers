/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
};

var g_Xml_Headers = {
	'Accept': 'application/xml, text/xml, */*; q=0.01',
	'X-Requested-With': 'XMLHttpRequest',
	'Wicket-Ajax': 'true',
	'Wicket-Ajax-BaseURL': 'main',
	'Wicket-FocusedElementId': 'id19',
	'Origin': 'https://online.absolutbank.ru'
}

var baseurl = 'https://online.absolutbank.ru/app/';

function login(prefs, result) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	function isLoggedIn() {
		return /logout/i.test(html);
	}

	if (!isLoggedIn()) {
		// html = checkForRedirect(html);
		
		var actions = findWicketActions(html);
		var wicketAction = [];
		
		var passId = getParam(html, null, null, /<input[^>]*name="password"[^>]*id="([^"]+)/i);
		var loginId = getParam(html, null, null, /<input[^>]*name="login"[^>]*id="([^"]+)/i);
		var formId = getParam(html, null, null, /<a[^>]*class="button[^>]*id="([^"]+)/i);
		
		actions.forEach(function (element, index, array) {
			var json = getJson(element);
			
			var url = (json.u || '').replace(/^.\/main/, 'main').replace(/;jsessionid[^?]+/i, '');
			switch(json.c) {
				case loginId:
					wicketAction[0] = url;
					break;
				case passId:
					wicketAction[1] = url;
					break;
				case formId:
					wicketAction[2] = url;
					break;
			}
		});
		
		var paramsArr = [
			{login: prefs.login},
			{password: prefs.password},
			// {login: prefs.login, password: prefs.password}
		];
		paramsArr[2] = joinObjects(paramsArr[0], paramsArr[1]);
		
		// request	
		for(var i = 0; i < wicketAction.length; i++) {
			html = AnyBalance.requestPost(baseurl + wicketAction[i], paramsArr[i], addHeaders(g_Xml_Headers));
		}
		
		if (!isLoggedIn()) {
			var error = AB.getParam(html, null, null, /"feedbackPanelERROR"[^>]*>([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /Неверно указан/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
		__setLoginSuccessful();
	}

	return html;
}

function processProfile(html, result) {
	if(!isAvailable('profile'))
		return;

	var html = requestGetWicketAction(html, /<span[^>]+class="link" id="(id[^"]+)/i)
	
	result.profile = {};
	
	getParam(html, result.profile, 'profile.fio', /ФИО((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.birthday', /Дата рождения((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.phone', /Телефон((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.adress', /Адрес регистрации((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.adressHome', /Домашний адрес((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
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
		var json = getJson(actions[i]);
		var url = (json.u || '').replace(/^.\/main/, 'main').replace(/;jsessionid[^?]+/i, '');
		
		if(json.c === exactId)
			return url;		
	}
}

function requestGetWicketAction(html, regex) {
	var wicketId = getParam(html, null, null, regex);
	if(!wicketId)
		throw new AnyBalance.Error('Не нашли wicketId!');
	
	var actions = findWicketActions(html);
	var action = findExactWickeAction(actions, wicketId);
	
	return AnyBalance.requestGet(baseurl + action + '&_=' + new Date().getTime(), addHeaders(g_Xml_Headers));
}

function checkForRedirect(html) {
	if(/<redirect>/i.test(html)) {
		var href = getParam(html, null, null, /main;[^\]]+/i);
		if(!href) {
			AnyBalance.trace('Запрошен редиретк, но ссылка на него не найдена, сайт изменен?');
		}
		var html = AnyBalance.requestGet(baseurl + href, g_headers);
	}
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!isAvailable('cards'))
		return;
	
	var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
	html = requestGetWicketAction(html, /<div[^>]+class="inner"[^>]+id="(id[^"]+)"/i);
	
	var cards = getElements(html, /<div[^>]+class=['"]card inner['"][^>]*>/ig);
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i) {
		var _id = getParam(cards[i], null, null, /<small[^>]+class="gray"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		var title = getParam(cards[i], null, null, /"card-name"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title + ' ' + _id};
		
		if(__shouldProcess('cards', c)) {
			processCard(cards[i], c, html);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result, html) {
	getParam(card, result, 'cards.balance', /class="amount"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);	
	getParam(card, result, ['cards.currency', 'cards'], /class="amount"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);	
	
	var html = requestGetWicketAction(html, /<div[^>]+class="card inner"[^>]+id="(id[^"]+)"/i);
	
	getParam(html, result, 'cards.limit', /Кредитный лимит((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.debt', /Общая задолженность((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.ovedraft', /Текущий овердрафт((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'cards.ovedraft_pcts', /Сумма начисленных процентов по овердрафту((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.ovedraft_overdue', /Просроченный овердрафт((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.overlimit', /Сверхлимитная задолженность((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.commissions', /Cумма комиссий((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.penalty', /Сумма штрафов((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.billing_date', /Расчетная дата((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.minpay', /Минимальный платеж((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.minpay_overdue', /в том числе просроченные минимальные платежи((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.till', /Срок действия((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.holderName', /Имя владельца((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.status', /Статус карты((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	
	if(typeof processCardTransactions != 'undefined')
		processCardTransactions(html, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
	if(!isAvailable('accounts'))
		return;
	
	var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
	html = requestGetWicketAction(html, /<div[^>]+class="inner"[^>]+id="(id[^"]+)"/i);
	var accounts = getElements(html, /<div[^>]+class=['"]account inner single-account['"][^>]*>/ig);
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i) {
		var htmlLocal = requestGetWicketAction(accounts[i] + html, /id="(id[^"]+)"/i);
		
		var c = {
			__id: getParam(htmlLocal, null, null, /№(?:[^>]*>)?(\d{20})/i, replaceTagsAndSpaces), 
			__name: getParam(htmlLocal, null, null, /class="dashed active"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces)
		};
		
		if(__shouldProcess('accounts', c)){
			processAccount(htmlLocal, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(html, result) {
    getParam(html, result, 'accounts.balance', /class="[^"]*amounts"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['accounts.currency', 'accounts'], /class="[^"]*amounts"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	
	if(typeof processAccountTransactions != 'undefined')
		processAccountTransactions(html, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Кредиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!isAvailable('credits'))
		return;
	
	var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
	html = requestGetWicketAction(html, /<div[^>]+class="inner"[^>]+id="(id[^"]+)"(?:[^>]*>){3,7}\s*Кредиты/i);
	
	var credits = getElements(html, /<div[^>]+class=['"]account inner[^>]*>/ig);
	
	AnyBalance.trace('Найдено кредитов: ' + credits.length);
	result.credits = [];
	
	for(var i=0; i < credits.length; ++i) {
		var title = getParam(credits[i], null, null, /<span[^>]*class=['"]index['"](?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		// Ну нет тут возможности определить id 
		var _id = title;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credits[i], c, html);
		}
		
		result.credits.push(c);
	}
}

function processCredit(credit, result, html) {
	getParam(credit, result, 'credits.balance', /class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);	
	getParam(credit, result, ['credits.currency', 'credits'], /class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);	
	
	getParam(credit, result, 'credits.minpay_till', /К оплате([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(credit, result, 'credits.minpay', /К оплате[\s\S]*?class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);	
	
	
	// var html = requestGetWicketAction(html, /<div[^>]+class="account inner"[^>]+id="(id[^"]+)"/i);
	
	// getParam(html, result, 'cards.limit', /Кредитный лимит((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.debt', /Общая задолженность((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.ovedraft', /Текущий овердрафт((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	
	// getParam(html, result, 'cards.ovedraft_pcts', /Сумма начисленных процентов по овердрафту((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.ovedraft_overdue', /Просроченный овердрафт((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.overlimit', /Сверхлимитная задолженность((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.commissions', /Cумма комиссий((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.penalty', /Сумма штрафов((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.billing_date', /Расчетная дата((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.minpay', /Минимальный платеж((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.minpay_overdue', /в том числе просроченные минимальные платежи((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'cards.till', /Срок действия((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseDate);
	// getParam(html, result, 'cards.holderName', /Имя владельца((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	// getParam(html, result, 'cards.status', /Статус карты((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
	
	// if(typeof processCardTransactions != 'undefined')
		// processCardTransactions(html, result);
}