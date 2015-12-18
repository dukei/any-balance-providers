/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://retail.baltica.ru';//'http://test.isimplelab.com:8087/internetbank';
//	var path = '/rest/personal/account'; //?sync_accounts=true
var pathCards = '/rest/personal/card?sync_cards=true';
var pathAccounts = '/rest/personal/account?sync_accounts=true';
var pathDeposits = '/rest/personal/deposit?sync_deposits=true';
var pathCredits = '/rest/personal/credit?sync_credits=true';

function main() {
	AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['TLSv1.2']});
	
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    if(prefs.type == 'acc')
		fetchAcc(baseurl, prefs);
	else if(prefs.type == 'dep')
		fetchDep(baseurl, prefs);
	// По умолчанию карта
    else
		fetchCard(baseurl, prefs);
}

function fetchCard(baseurl, prefs) {
	var json = getHTTPDigestPage(baseurl, pathCards);
	
	var result = {success: true};
	
	var card = null;
	if(isArray(json.card)){
		if(!prefs.digits){
			card = json.card[0];
		}else{
			for(var i=0; i<json.card.length; ++i){
				if(endsWith(json.card[i].formattedNumber, prefs.digits)){
					card = json.card[i];
					break;
				}
			}
			if(!card)
				throw new AnyBalance.Error('Не удаётся найти карту с последними цифрами ' + prefs.digits);
		}
	}else{
		card = json.card;
	}

	getParam(card.formattedNumber, result, '__tariff', null, replaceTagsAndSpaces);
	getParam(card.formattedNumber, result, 'card_num', null, replaceTagsAndSpaces);
	getParam(card.info, result, 'card_type', null, replaceTagsAndSpaces);
	getParam(card.number, result, 'acc_num', null, replaceTagsAndSpaces);
	getParam(card.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(card.currency, result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	getParam(card.actual, result, 'actual', null, replaceTagsAndSpaces, parseDate);
	getParam(card.bankingInformation.payee, result, 'fio', null, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);	
}

function fetchDep(baseurl, prefs) {
	var json = getHTTPDigestPage(baseurl, pathDeposits);
	
	var result = {success: true};
	
	var deposit;
	// Если массив - значит несколько счетов в кабинете
	if(isArray(json.deposit)) {
		if(prefs.digits) {
			for(var i = 0; i < json.deposit.length; i++) {
				var current = json.deposit[i];
				
				if(endsWith(current.number, prefs.digits)) {
					AnyBalance.trace('Found deposit that ends with ' + prefs.digits);
					deposit = current;
				}
			}
			if(!deposit)
				throw new AnyBalance.Error('Не удалось найти счет который заканчивается на ' + prefs.digits + '. Возможно проблемы на сайте или сайт изменен!');
		} else {
			deposit = json.deposit[0];
		}
	} else {
		deposit = json.deposit;
	}

	getParam(deposit.info, result, 'acc_type', null, replaceTagsAndSpaces);
	getParam(deposit.number, result, 'acc_num', null, replaceTagsAndSpaces);
	getParam(deposit.number, result, '__tariff', null, replaceTagsAndSpaces);
	getParam(deposit.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(deposit.currency, result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	getParam(deposit.actual, result, 'actual', null, replaceTagsAndSpaces, parseDate);
	getParam(deposit.bankingInformation.payee, result, 'fio', null, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);	
}

function fetchAcc(baseurl, prefs) {
	var json = getHTTPDigestPage(baseurl, pathAccounts);
	
	var result = {success: true};
	
	var account;
	// Если массив - значит несколько счетов в кабинете
	if(isArray(json.account)) {
		if(prefs.digits) {
			for(var i = 0; i < json.account.length; i++) {
				var current = json.account[i];
				
				if(endsWith(current.number, prefs.digits)) {
					AnyBalance.trace('Found account that ends with ' + prefs.digits);
					account = current;
				}
			}
			if(!account)
				throw new AnyBalance.Error('Не удалось найти счет который заканчивается на ' + prefs.digits + '. Возможно проблемы на сайте или сайт изменен!');
		} else {
			account = json.account[0];
		}
	} else {
		account = json.account;
	}

	getParam(account.info, result, 'acc_type', null, replaceTagsAndSpaces);
	getParam(account.number, result, 'acc_num', null, replaceTagsAndSpaces);
	getParam(account.number, result, '__tariff', null, replaceTagsAndSpaces);
	getParam(account.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(account.currency, result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	getParam(account.actual, result, 'actual', null, replaceTagsAndSpaces, parseDate);
	getParam(account.bankingInformation.payee, result, 'fio', null, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);	
}