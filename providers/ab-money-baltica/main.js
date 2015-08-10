/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://retail.baltica.ru';//'http://test.isimplelab.com:8087/internetbank';
//	var path = '/rest/personal/account'; //?sync_accounts=true
var pathCards = '/rest/personal/card?sync_cards=true';
var pathAccounts = '/rest/personal/account?sync_accounts=true';
var pathDeposits = '/rest/personal/deposit?sync_deposits=true';
var pathCredits = '/rest/personal/credit?sync_credits=true';

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
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

function checkForLoginErrors(html) {
	var errors = {
		'UsernameNotFoundException':'Такого пользователя не существует!',
		'This request requires HTTP authentication':'Проверьте правильность ввода пароля!'
	}
	
	if(/<h1>Сервер на обслуживании.<\/h1>/.test(html))
		throw new AnyBalance.Error('Приносим свои извинения, сервер находится на обслуживании. Повторите попытку через несколько минут.');
	
	var match = /(UsernameNotFoundException|This request requires HTTP authentication)/i.exec(html);
	
	if(match) {
		var error = errors[match[1]];
		if (error)
			throw new AnyBalance.Error(error, null, true);
	}
	
	AnyBalance.trace(html);
	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
}

function getHTTPDigestPage(baseurl, path) {
	var prefs = AnyBalance.getPreferences();
	//Описание HTML Digest: http://ru.wikipedia.org/wiki/%D0%94%D0%B0%D0%B9%D0%B4%D0%B6%D0%B5%D1%81%D1%82_%D0%B0%D1%83%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D1%8F
	var html = AnyBalance.requestGet(baseurl + path, addHeaders({Authorization: 'SP Digest username="' + prefs.login + '"'}));
	var info = AnyBalance.getLastResponseHeader('WWW-Authenticate');
	// Не удалось авторизоваться, пользователь не найден
	if(!info) {
		checkForLoginErrors(html);
	}
	var realm = getParam(info, null, null, /realm="([^"]*)/);
	var nonce = getParam(info, null, null, /nonce="([^"]*)/);
	var salt = getParam(info, null, null, /salt="([^"]*)/);
	var spass; //Пароль солим по спец. технологии от iSimple :)
	if (isset(salt)) {
		var saltOrig = CryptoJS.enc.Base64.parse(salt).toString(CryptoJS.enc.Utf8);
		spass = CryptoJS.MD5(prefs.password + '{' + saltOrig + '}');
	} else {
		spass = CryptoJS.MD5(prefs.password);
	}
	var cnonce = CryptoJS.MD5('' + Math.random());
	var ha1 = CryptoJS.MD5(prefs.login + ':' + realm + ':' + spass);
	var ha2 = CryptoJS.MD5('GET:' + path);
	var response = CryptoJS.MD5(ha1 + ':' + nonce + ':00000000:' + cnonce +	':auth:' + ha2);
	html = AnyBalance.requestGet(baseurl + path, addHeaders({Authorization: 'SP Digest username="' + prefs.login + '", realm="' + realm + '", nonce="' + nonce + '", uri="' + path + '", response="' + response + '", qop="auth", nc="00000000", cnonce="' + cnonce + '"'}));
	
	try {
		var json = getJson(html);
	} catch (e) {
		AnyBalance.trace('Не удалось получить данные по продукту, узнаем почему...');
		checkForLoginErrors(html);
	}
	// Нет такого типа продуктов
	if(!json) {
		throw new AnyBalance.Error('У вас нет выбранного типа продукта.');
	}
	// Возвращаем объект
	return json;
}