/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var baseurl = 'https://online.trust.ru/';
var baseurlAPI = baseurl + 'api/v1/';

var currencys = {
	810: 'р',
	840: '$',
}

var states = {
	0: 'Активен',
	1: 'Скрыт'
}

function apiCall(action, params, addOnHeaders) {
	var apiHeaders = addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': '*/*',
		'CSP': 'active',
	});
	
	var html = AnyBalance.requestPost(baseurlAPI + action, params, addOnHeaders ? addHeaders(apiHeaders, addOnHeaders) : apiHeaders);
	
	if(!html) {
		throw new AnyBalance.Error('Не удалось получить ответ от сервера. Ошибка при компановке запроса, проверьте заголовок Authorization!');
	}
	
	var json = getJson(html);
	
	if(json.error) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error);
	}
	
	return json;
}

function getToken() {
	return AnyBalance.getData('token');
}

function doLogin(prefs) {
	var json = apiCall('sessions', {
		'username': prefs.login,
		'password': prefs.password,
	});
	
	var token = json.sessionKey;
	
	if(json.next == 'AUTH_SMS') {
		AnyBalance.trace('Требуется ввод одноразового кода из СМС.');
		
		if(AnyBalance.getLevel() >= 7) {
			var sms = AnyBalance.retrieveCode("Пожалуйста, введите код из смс для входа в интернет-банк.");
			AnyBalance.trace('Смс получено: ' + sms);
		} else {
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите приложение!');
		}
		
		if(!sms)
			throw new AnyBalance.Error('Не удалось получить код из смс!');
		
		json = apiCall('auth2', {smsKey: sms}, {'Authorization': token});
	}
	
	if(!token || json.next != 'MAIN') {
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось войти, проблемы на сайте или сайт изменен!');
	}
	
	__setLoginSuccessful();

	AnyBalance.setData('token', token);
	AnyBalance.saveData();	
	return json;
}
function login(prefs) {
	AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['TLSv1.1']});
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'i', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var token = getToken();
	
	if(!token) {
		AnyBalance.trace('Мы еще не входили в кабинет, самое время, сделать это сейчас.');
		var json = doLogin(prefs);
	} else {
		AnyBalance.trace('Мы уже вошли, повторно входить не будем.');
		
		html = AnyBalance.requestGet(baseurlAPI + 'main', addHeaders({
			'Authorization': token,
			'Referer': baseurl + 'i',
		}));
		
		// Токен протух, надо входить
		if(!html) {
			AnyBalance.trace('Сессия устарела, нужно войти повторно.');
			var json = doLogin(prefs);
		} else {
			var json = getJson(html);
		}
	}
	
	return json;
}
////////////////////////////////////////////////////////////////////////////////////////
// Профиль 
////////////////////////////////////////////////////////////////////////////////////////
function processProfile(jsonInfo, result) {
	if(!AnyBalance.isAvailable('profile'))
		return;	
	
	getParam(jsonInfo.profile.address, result, 'profile.address', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.email, result, 'profile.email', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.filial, result, 'profile.filial', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.name, result, 'profile.name', null, replaceTagsAndSpaces);
	getParam(jsonInfo.profile.phone, result, 'profile.phone', null, replaceTagsAndSpaces);
}
////////////////////////////////////////////////////////////////////////////////////////
// Счета 
////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(jsonInfo, result) {
	// Есть разные кабинеты, в которых карты в json или в json.main
	// if(!jsonInfo.main)
		// jsonInfo.main = jsonInfo;
	
	var accounts = jsonInfo.accounts;
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var _id = accounts[i].number;
		var title = accounts[i].number;
		
		var acc = {__id: _id, __name: title};
		
		if(__shouldProcess('accounts', acc)){
			processAccount(accounts[i], acc);
		}
		
		result.accounts.push(acc);
	}
}

function processAccount(account, result) {
	getParam(account.rest + '', result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[account.currency], result, ['accounts.currency', 'accounts.balance']);

	getParam(account.number, result, 'accounts.accnum', null, replaceTagsAndSpaces);
	getParam(account.type, result, 'accounts.type', null, replaceTagsAndSpaces);
	getParam(states[account.state], result, 'accounts.status');
	
	processAccountTransactions(account, result);
}

function processAccountTransactions(account, result) {
	if(!AnyBalance.isAvailable('accounts.transactions'))
		return;
	
	result.transactions = [];
	
	var html = AnyBalance.requestGet(baseurlAPI + 'pfm/' + account.key + '?from=' + getFormattedDate(5) + '&to=' + getFormattedDate(), addHeaders({Authorization: getToken()}));
	var json = getJson(html);
	
	for(var i = 0; i<json.transactions.length; i++) {
		var curr = json.transactions[i];
		var t = {};
		
		getParam(curr.transAmount + '', t, 'accounts.transactions.sum', null, null, parseBalance);
		getParam(currencys[curr.transCurr], t, ['accounts.transactions.currency', 'accounts.transactions.sum']);
		
		getParam(curr.title, t, 'accounts.transactions.name');
		getParam(curr.details, t, 'accounts.transactions.details');
		getParam(curr.transDateTime, t, 'accounts.transactions.time', null, null, parseDate);
		
		result.transactions.push(t);
	}
}
////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////
function processCards(jsonInfo, result) {
	// Есть разные кабинеты, в которых карты в json или в json.main
	// if(!jsonInfo.main)
		// jsonInfo.main = jsonInfo;
	
	var cards = jsonInfo.cards;
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = cards[i].number;
		var title = cards[i].number;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
	getParam(card.rest + '', result, 'cards.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[card.currency], result, ['cards.currency', 'cards.balance']);
	
	getParam(card.number, result, 'cards.cardnum', null, replaceTagsAndSpaces);
    getParam(card.type, result, 'cards.type', null, replaceTagsAndSpaces);
	getParam(card.dateExpire, result, 'cards.till', null, replaceTagsAndSpaces, parseDateWord);
    getParam(card.cardHolderName, result, 'cards.fio', null, replaceTagsAndSpaces);
	getParam(states[card.state], result, 'cards.status');
	
	processCardTransactions(card, result);
}

function processCardTransactions(card, result) {
	if(!AnyBalance.isAvailable('cards.transactions'))
		return;	
	
	result.transactions = [];
	
	var html = AnyBalance.requestGet(baseurlAPI + 'pfm/' + card.key + '?from=' + getFormattedDate(5) + '&to=' + getFormattedDate(), addHeaders({Authorization: getToken()}));
	var json = getJson(html);
	
	for(var i = 0; i<json.transactions.length; i++) {
		var curr = json.transactions[i];
		
		// Проверяем, чтобы получились только транзакции по текущей карте
		if(card.number != curr.card)
			continue;
		
		var t = {};
		
		getParam(curr.transAmount + '', t, 'cards.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
		getParam(currencys[curr.transCurr], t, ['cards.transactions.currency', 'cards.transactions.sum'], null, replaceTagsAndSpaces);
		getParam(curr.title, t, 'cards.transactions.name', null, replaceTagsAndSpaces);
		getParam(curr.details, t, 'cards.transactions.details', null, replaceTagsAndSpaces);
		getParam(curr.transDateTime, t, 'cards.transactions.time', null, replaceTagsAndSpaces, parseDate);
		
		result.transactions.push(t);
	}
}
////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(jsonInfo, result) {
	// Есть разные кабинеты, в которых карты в json или в json.main
	// if(!jsonInfo.main)
		// jsonInfo.main = jsonInfo;
	
	var deposits = jsonInfo.deposits;
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i){
		var _id = deposits[i].number;
		var title = deposits[i].number;
		
		var d = {__id: _id, __name: title};
		
		if(__shouldProcess('deposits', d)){
			processDeposit(deposits[i], d);
		}
		
		result.deposits.push(d);
	}
}

function processDeposit(deposit, result) {
	getParam(deposit.rest + '', result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[deposit.currency], result, ['deposits.currency', 'deposits.balance']);

	getParam(deposit.number, result, 'deposits.accnum', null, replaceTagsAndSpaces);
    getParam(deposit.type, result, 'deposits.type', null, replaceTagsAndSpaces);
	getParam(deposit.closed, result, 'deposits.till', null, replaceTagsAndSpaces, parseDate);
	getParam(states[deposit.state], result, 'deposits.status');
    getParam(deposit.contract, result, 'deposits.contract', null, replaceTagsAndSpaces);
    getParam(deposit.rate + '', result, 'deposits.rate', null, replaceTagsAndSpaces, parseBalance);
	
	processDepositTransactions(deposit, result);
}

function processDepositTransactions(deposit, result) {
	if(!AnyBalance.isAvailable('deposits.transactions'))
		return;	
	
	result.transactions = [];
	
	var html = AnyBalance.requestGet(baseurlAPI + 'pfm/' + deposit.key + '?from=' + getFormattedDate(5) + '&to=' + getFormattedDate(), addHeaders({Authorization: getToken()}));
	var json = getJson(html);
	
	for(var i = 0; i<json.transactions.length; i++) {
		var curr = json.transactions[i];
		
		var t = {};
		
		getParam(curr.transAmount + '', t, 'deposits.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
		getParam(currencys[curr.transCurr], t, ['deposits.transactions.currency', 'deposits.transactions.sum'], null, replaceTagsAndSpaces);
		getParam(curr.title, t, 'deposits.transactions.name', null, replaceTagsAndSpaces);
		getParam(curr.details, t, 'deposits.transactions.details', null, replaceTagsAndSpaces);
		getParam(curr.transDateTime, t, 'deposits.transactions.time', null, replaceTagsAndSpaces, parseDate);
		
		result.transactions.push(t);
	}
}
////////////////////////////////////////////////////////////////////////////////////////
// Шаблоны
////////////////////////////////////////////////////////////////////////////////////////
function processTemplates(jsonInfo, result) {
	if(!AnyBalance.isAvailable('templates'))
		return;
	
	// Есть разные кабинеты, в которых карты в json или в json.main
	// if(!jsonInfo.main)
		// jsonInfo.main = jsonInfo;
	
	var templates = jsonInfo.templates;
	AnyBalance.trace('Найдено шаблонов: ' + templates.length);
	result.templates = [];
	
	for(var i=0; i < templates.length; ++i){
		var _id = templates[i].clientOperation.templateId;
		var title = templates[i].clientOperation.template;
		
		var t = {__id: _id, __name: title};
		
		if(__shouldProcess('templates', t)){
			processTemplate(templates[i], t);
		}
		
		result.templates.push(t);
	}
}

function processTemplate(template, result) {
	getParam(template.amount + '', result, 'templates.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currencys[template.fromCurrency], result, ['templates.currency', 'templates.balance']);

	getParam(template.ground, result, 'templates.ground', null, replaceTagsAndSpaces);
    getParam(template.receiver, result, 'templates.receiver', null, replaceTagsAndSpaces);
    getParam(template.receiverAccount, result, 'templates.receiverAccount', null, replaceTagsAndSpaces);
    getParam(template.receiverBIC, result, 'templates.receiverBIC', null, replaceTagsAndSpaces);
	
	if (template.clientOperation.description)
		getParam(template.clientOperation.description, result, 'templates.description', null, replaceTagsAndSpaces);
	if (template.clientOperation.operationType)
		getParam(template.clientOperation.operationType + '', result, 'templates.operationType', null, replaceTagsAndSpaces);
	if (template.clientOperation.operation)
		getParam(template.clientOperation.operation + '', result, 'templates.operation', null, replaceTagsAndSpaces);
	if (template.clientOperation.operationSubType)
		getParam(template.clientOperation.operationSubType + '', result, 'templates.operationSubType', null, replaceTagsAndSpaces);
	
	if(template.targetKey && !template.receiverAccount) {
		getParam(template.targetKey, result, 'templates.receiverAccount', null, replaceTagsAndSpaces);
	}
}
////////////////////////////////////////////////////////////////////////////////////////
// Провайдеры
////////////////////////////////////////////////////////////////////////////////////////
function processProviders(result) {
	if(!AnyBalance.isAvailable('providers'))
		return;
	
	var json = getJsonAPI('payments/regions');
	
	result.providers = [];
	
	for(var r = 0; r<json.regions.length; r++) {
		var currRegion = json.regions[r];
		
		var groupJson = getJsonAPI('payments/groups?count=3&region=' + encodeURIComponent(currRegion));
		
		// Получим группы
		for(var i=0;i<groupJson.simpleProviderGroupList.length; i++) {
			var currGroup = groupJson.simpleProviderGroupList[i];
			
			var groupName = currGroup.name;
			var groupId = currGroup.id;
			
			var providersJson = getJsonAPI('payments/providers?id=' + groupId + '&region=' + encodeURIComponent(currRegion));
			
			// Получим провайдеры из группы
			for(var p = 0; p < providersJson.simpleProviders.length; p++) {
				var currProvider = providersJson.simpleProviders[p];
				
				var provName = currProvider.name;
				var provId = currProvider.id;
				
				var prov = {
					__id: provId, 
					__name: provName,
					groupName: groupName,
					groupId: groupId,
					region: currRegion
				};
				
				if(__shouldProcess('providers', prov)){
					processProvider(currProvider, prov);
				}
				
				result.providers.push(prov);
			}
		}
	}
}

function processProvider(prov, result) {
	var provJson = getJsonAPI('payments/providers/' + result.__id);
	
	result.fields = [];
	
	for(var i = 0; i < provJson.simplePageList[0].simpleControlList.length; i++) {
		var curr = provJson.simplePageList[0].simpleControlList[i];
		
		if(!curr.name)
			continue;
		
		var f = {
			name: curr.name,
			desc: curr.header,
			type: curr.type
		}
		
		result.fields.push(f);
	}
}

function getJsonAPI(url) {
	var html = AnyBalance.requestGet(baseurlAPI + url, addHeaders({Authorization: getToken()}));
	if(!html)
		throw new AnyBalance.Error('Не удалось получить ответ от сервера!');
	
	return getJson(html)
}

function getFormattedDate(yearCorr) {
	var dt = new Date();
	
	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth()+1) < 10 ? '0' + (dt.getMonth()+1) : dt.getMonth()+1);
	var year = isset(yearCorr) ? dt.getFullYear() - yearCorr : dt.getFullYear();
	
	return year + '-' + month + '-' + day;
}