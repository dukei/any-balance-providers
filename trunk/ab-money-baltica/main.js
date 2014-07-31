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
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    if(prefs.type == 'acc')
		fetchAcc(baseurl);
	// По умолчанию карта
    else
		fetchCard(baseurl);
}

function fetchCard(baseurl) {
	var json = getHTTPDigestPage(baseurl, pathCards);
	
	var result = {success: true};
	
	getParam(json.card.formattedNumber, result, '__tariff', null, replaceTagsAndSpaces);
	getParam(json.card.formattedNumber, result, 'card_num', null, replaceTagsAndSpaces);
	getParam(json.card.info, result, 'card_type', null, replaceTagsAndSpaces);
	getParam(json.card.number, result, 'acc_num', null, replaceTagsAndSpaces);
	getParam(json.card.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.card.currency, result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	getParam(json.card.actual, result, 'actual', null, replaceTagsAndSpaces, parseDate);
	getParam(json.bankingInformation.payee, result, 'fio', null, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);	
}

function fetchAcc(baseurl) {
	throw new AnyBalance.Error('Получение данных по счетам пока не поддерживается! Свяжитесь с разработчиками для исправления ситуации.');
	/*
	var json = getHTTPDigestPage(baseurl, pathAccounts);
	
	var result = {success: true};
	
	getParam(json.card.formattedNumber, result, '__tariff', null, replaceTagsAndSpaces);
	getParam(json.card.formattedNumber, result, 'card_num', null, replaceTagsAndSpaces);
	getParam(json.card.info, result, 'card_type', null, replaceTagsAndSpaces);
	getParam(json.card.number, result, 'acc_num', null, replaceTagsAndSpaces);
	getParam(json.card.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.card.currency, result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	getParam(json.card.actual, result, 'actual', null, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);	
	*/
}

function checkForLoginErorrs(html) {
	var errors = {
		'UsernameNotFoundException':'Такого пользователя не существует!',
		'This request requires HTTP authentication':'Проверьте правильность ввода пароля!'
	}
	
	var match = /(UsernameNotFoundException|This request requires HTTP authentication)/i.exec(html);
	
	if(match) {
		var error = errors[match[1]];
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));	
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
		checkForLoginErorrs(html);
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
		checkForLoginErorrs(html);
	}
	// Нет такого типа продуктов
	if(!json) {
		throw new AnyBalance.Error('Выбранный тип продукта не существует в системе!');
	}
	// Возвращаем объект
	return json;
}