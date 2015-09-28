/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://online.intercommerz.ru:8443';//'http://test.isimplelab.com:8087/internetbank';
//	var path = '/rest/personal/account'; //?sync_accounts=true
var pathCards = '/rest/personal/card?sync_cards=true';
var pathAccounts = '/rest/personal/account?sync_accounts=true';
var pathDeposits = '/rest/personal/deposit?sync_deposits=true';
var pathCredits = '/rest/personal/credit?sync_credits=true';

////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////
function processCards(result) {
	var json = getHTTPDigestPage(baseurl, pathCards);
	
	var cards = isArray(json.card) ? json.card : [json.card];
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = cards[i].formattedNumber;
		var title = cards[i].formattedNumber;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
	getParam(card.formattedNumber, result, 'cards.card_num', null, replaceTagsAndSpaces);
	getParam(card.info, result, 'cards.card_type', null, replaceTagsAndSpaces);
	getParam(card.number, result, 'cards.acc_num', null, replaceTagsAndSpaces);
	getParam(card.balance + '', result, 'cards.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(card.currency, result, ['cards.currency', 'cards.balance'], null, replaceTagsAndSpaces);
	getParam(card.actual, result, 'cards.actual', null, replaceTagsAndSpaces, parseDate);
	getParam(card.bankingInformation.payee, result, 'cards.fio', null, replaceTagsAndSpaces);
	
	processCardTransactions(card, result);
}

function processCardTransactions(card, result) {
	if(!AnyBalance.isAvailable('cards.transactions'))
		return;	
	
	var json = getHTTPDigestPage(baseurl, '/rest/personal/account/statement?account_number=' + card.number + '&date_from=' + getFormattedDate(5, '') + '&date_to=' + getFormattedDate(0, ''));
	
	result.transactions = [];
	
	for(var i = 0; i<json.transactions.length; i++) {
		var curr = json.transactions[i];
		
		var t = {};
		
		getParam(curr.amount + '', t, 'cards.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
		getParam(curr.currency, t, ['cards.transactions.currency', 'cards.transactions.sum'], null, replaceTagsAndSpaces);
		getParam(curr.details, t, 'cards.transactions.details', null, replaceTagsAndSpaces);
		getParam(curr.docDate, t, 'cards.transactions.time', null, replaceTagsAndSpaces, parseDate);
		
		result.transactions.push(t);
	}
}
////////////////////////////////////////////////////////////////////////////////////////
// Счета 
////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
	var json = getHTTPDigestPage(baseurl, pathAccounts);
	
	var accounts = isArray(json.account) ? json.account : [json.account];
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
	getParam(account.info, result, 'accounts.acc_type', null, replaceTagsAndSpaces);
	getParam(account.number, result, 'accounts.acc_num', null, replaceTagsAndSpaces);
	getParam(account.balance + '', result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(account.currency, result, ['accounts.currency', 'accounts.balance'], null, replaceTagsAndSpaces);
	getParam(account.actual, result, 'accounts.actual', null, replaceTagsAndSpaces, parseDate);
	getParam(account.bankingInformation.payee, result, 'accounts.fio', null, replaceTagsAndSpaces);
	
	processAccountTransactions(account, result);
}

function processAccountTransactions(account, result) {
	if(!AnyBalance.isAvailable('accounts.transactions'))
		return;
	
	var json = getHTTPDigestPage(baseurl, '/rest/personal/account/statement?account_number=' + account.number + '&date_from=' + getFormattedDate(5, '') + '&date_to=' + getFormattedDate(0, ''));
	
	result.transactions = [];
	
	for(var i = 0; i<json.transactions.length; i++) {
		var curr = json.transactions[i];
		
		var t = {};
		
		getParam(curr.amount + '', t, 'accounts.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
		getParam(curr.currency, t, ['accounts.transactions.currency', 'accounts.transactions.sum'], null, replaceTagsAndSpaces);
		getParam(curr.details, t, 'accounts.transactions.details', null, replaceTagsAndSpaces);
		getParam(curr.docDate, t, 'accounts.transactions.time', null, replaceTagsAndSpaces, parseDate);
		
		result.transactions.push(t);
	}
}
////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(result) {
	throw new AnyBalance.Error('Депозиты не поддерживаются на данный момент, свяжитесь с разработчиками, пожалуйста.')
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
function processTemplates(result) {
	if(!AnyBalance.isAvailable('templates'))
		return;
	
	var json = getHTTPDigestPage(baseurl, '/rest/personal/template/list');
	
	var templates = isArray(json.template) ? json.template : [json.template];
	
	AnyBalance.trace('Найдено шаблонов: ' + templates.length);
	
	result.templates = [];
	
	for(var i=0; i < templates.length; ++i){
		var _id = templates[i].id;
		var title = templates[i].name;
		
		var t = {__id: _id, __name: title};
		
		if(__shouldProcess('templates', t)){
			processTemplate(templates[i], t, '/rest/personal/payment_services/process_pay?target_id=' + _id + '&is_template=true');
		}
		
		result.templates.push(t);
	}
}
// Одинаковый функционал для шаблонов и провайдеров
function processTemplate(template, result, url) {
	var json = getHTTPDigestPage(baseurl, url, 'POST');
	
	if(!json.fields)
		return;
	
	result.fields = [];
	
	var tempData = [];
	for(var i = 0; i < json.fields.length; i++) {
		var curr = json.fields[i];
		
		var f = {
			caption: curr.caption,
			key: curr.name, // id в другом массиве
		}
		
		for(var z = 0; z < json.document.entry.length; z++) {
			var currZ = json.document.entry[z];
			
			if(currZ.key == curr.name) {
				f.value = currZ.value;
				break;
			}
		}
		result.fields.push(f);
	}
}
////////////////////////////////////////////////////////////////////////////////////////
// Провайдеры
////////////////////////////////////////////////////////////////////////////////////////
function processProviders(result) {
	if(!AnyBalance.isAvailable('providers'))
		return;
	
	var groupJson = getHTTPDigestPage(baseurl, '/rest/personal/payment_services/search?entries=2000');
	
	result.providers = [];
	
	// Получим категории провайдеров (Сотовая связь и тд)
	for(var i=0;i<groupJson.groups.length; i++) {
		var currGroup = groupJson.groups[i];
		
		var groupName = currGroup.name;
		var groupId = currGroup.id;
		
		var providersJson = getHTTPDigestPage(baseurl, '/rest/personal/payment_services/search?group_id=' + groupId + '&entries=2000');
		
		var prov = {
			groupName: groupName,
			groupId: groupId,
		};
		
		// В этой группе есть платежные инструменты, надо их разобрать
		if(providersJson.paymentServices) {
			processProviderPaymentServices(providersJson, prov);
		}
		
		result.providers.push(prov);
		
		// А так же могут быть и группы, вложенные в группу
		if(providersJson.groups) {
			processProviderGroups(providersJson, result);
		}
	}
}

function processProviderGroups(groupJson, result) {
	for(var i=0;i<groupJson.groups.length; i++) {
		var currGroup = groupJson.groups[i];
		
		var groupName = currGroup.name;
		var groupId = currGroup.id;
		
		var providersJson = getHTTPDigestPage(baseurl, '/rest/personal/payment_services/search?group_id=' + groupId + '&entries=2000');
		
		var prov = {
			groupName: groupName,
			groupId: groupId,
		};
		
		if(providersJson.paymentServices) {
			processProviderPaymentServices(providersJson, prov);
		}
		
		result.providers.push(prov);
	}
}

function processProviderPaymentServices(prov, result) {
	// Получим провайдеры из группы
	for(var p = 0; p < prov.paymentServices.length; p++) {
		var currProvider = prov.paymentServices[p];
		
		var provName = currProvider.name;
		var provId = currProvider.id;
		
		result.__id = provId;
		result.__name = provName;
		
		
		if(__shouldProcess('providers', result)){
			processTemplate(currProvider, result, '/rest/personal/payment_services/process_pay?target_id=' + result.__id + '&is_template=false');
		}
	}	
}

function getFormattedDate(yearCorr, delimiter) {
	var dt = new Date();
	
	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth()+1) < 10 ? '0' + (dt.getMonth()+1) : dt.getMonth()+1);
	var year = isset(yearCorr) ? dt.getFullYear() - yearCorr : dt.getFullYear();
	
	if(isset(delimiter))
		return year + delimiter + month + delimiter + day;
	
	return year + '-' + month + '-' + day;
}