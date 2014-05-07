/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/xml',
	'Content-Type': 'text/xml',
	'Connection': 'keep-alive',
	'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.1.2; GT-I9300 Build/JZO54K) Android/2.1.1(121)'
};

var g_xml_login = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:login><ser:login>%LOGIN%</ser:login><ser:password>%PASSWORD%</ser:password></ser:login></soapenv:Body></soapenv:Envelope>',
	g_xml_accounts = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetAccounts /></soapenv:Body></soapenv:Envelope>',
	g_xml_cards = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetCards /></soapenv:Body></soapenv:Envelope>';

function translateError(error) {
	var errors = {
		'logins.password.incorrect': 'Неправильный логин или пароль',
		'profile.login.first_entry': 'Это ваш первый вход в Райффайзен.Connect. Пожалуйста, зайдите в https://connect.raiffeisen.ru через браузер и установите постоянный пароль',
		'profile.login.expired': 'Уважаемый клиент, срок действия Вашего пароля истёк, так как Вы не меняли Ваше имя пользователя и/или пароль в течение последних 180 дней. Для доступа к системе требуется изменить ваше имя пользователя и/или пароль на новые значения.',
	};
	if (errors[error]) return errors[error];
	AnyBalance.trace('Неизвестная ошибка: ' + error);
	return error;
}
function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
	checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');

	var baseurl = 'https://connect.raiffeisen.ru/mobile/services/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestPost(baseurl + 'RCAuthorizationService', g_xml_login.replace(/%LOGIN%/g, prefs.login).replace(/%PASSWORD%/g, prefs.password), addHeaders({SOAPAction: 'urn:login'}));
	
	if (!/<ax21:name>/i.test(html)) {
		var error = getParam(html, null, null, /<faultstring>([\s\S]*?)<\/faultstring>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) {
			var er = translateError(error);
			if (er)
				throw new AnyBalance.Error(er, null, /Неправильный логин или пароль|срок действия Вашего пароля истёк/i.test(er));
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет банк. Обратитесь к разработчикам.');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /<ax\d+:name>([\s\S]*?)<\/ax\d+:name>/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	
	if (prefs.type == 'card')
		fetchCard(baseurl, html, result);
	else if (prefs.type == 'acc')
		fetchAccount(baseurl, html, result);
	else if (prefs.type == 'dep')
		fetchDeposit(baseurl, html, result);
	else if (prefs.type == 'cred')
		fetchCredit(baseurl, html, result);
	else 
		fetchAccount(baseurl, html, result);
	
	AnyBalance.setResult(result);
}
//    
function fetchCard(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующей вас карты или не вводите ничего, чтобы получить информацию по первой карте');

    html = AnyBalance.requestPost(baseurl + 'RCCardService', g_xml_cards, addHeaders({SOAPAction: 'urn:GetCards'})); 
   
    var re = new RegExp('<ns:return[^>]*>((?:[\\s\\S](?!</ns:return>))*?<ax\\d+:number>[^<]*' + (prefs.num ? prefs.num : '\\d{4}') + '</ax\\d+:number>[\\s\\S]*?)</ns:return>', 'i');
    var info = getParam(html, null, null, re);
    if(!info)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не найдено ни одной карты');
	
	getParam(info, result, 'type', /<ax\d+:type>([\s\S]*?)<\/ax\d+:type>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'cardnum', /<ax\d+:number>([\s\S]*?)<\/ax\d+:number>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, '__tariff', /<ax\d+:number>([\s\S]*?)<\/ax\d+:number>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'accnum', /<ax\d+:accountNumber>([\s\S]*?)<\/ax\d+:accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'balance', /balance>([\s\S]*?)<\/ax[\s\S]{1,10}:balance>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', '__tariff'], /<ax\d+:currency>([\s\S]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'minpaytill', /<ax\d+:nextCreditPaymentDate>([\s\S]*?)<\/ax\d+:nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
    getParam(info, result, 'minpay', /<ax\d+:minimalCreditPayment>([\s\S]*?)<\/ax\d+:minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'limit', /<ax\d+:creditLimit>([\s\S]*?)<\/ax\d+:creditLimit>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'till', /<ax\d+:expirationDate>([\s\S]*?)<\/ax\d+:expirationDate>/i, replaceTagsAndSpaces, parseDateISO);

    if(AnyBalance.isAvailable('all')){
        var all = sumParam(html, null, null, /<ns:return[^>]*>([\s\S]*?)<\/ns:return>/ig);
        var out = [];
        for(var i=0; i<all.length; ++i){
            var info = all[i];
            var accnum = getParam(info, null, null, /<ax\d+:number>([\s\S]*?)<\/ax\d+:number>/i, replaceTagsAndSpaces, html_entity_decode);
            var balance = getParam(info, null, null, /<ax\d+:balance>([\s\S]*?)<\/ax\d+:balance>/i, replaceTagsAndSpaces, parseBalance);
            var currency = getParam(info, null, null, /<ax\d+:currency>([\s\S]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, html_entity_decode);
            out.push(accnum + ': ' + balance + ' ' + currency);
        }
        result.all = out.join('\n');
    }
}

function fetchAccount(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние цифры интересующего вас счета или не вводите ничего, чтобы получить информацию по первому счету');
    html = AnyBalance.requestPost(baseurl + 'RCAccountService', g_xml_accounts, addHeaders({SOAPAction: 'urn:GetAccounts'})); 
   
    var re = new RegExp('<ns:return[^>]*>((?:[\\s\\S](?!</ns:return>))*?<ax\\d+:number>\\d*' + (prefs.num ? prefs.num : '') + '</ax\\d+:number>[\\s\\S]*?)</ns:return>', 'i');
    var info = getParam(html, null, null, re);
    if(!info)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счета с последними цифрами ' + prefs.num : 'Не найдено ни одного счета');

    getParam(info, result, '__tariff', /<ax\d+:number>([\s\S]*?)<\/ax\d+:number>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'accnum', /<ax\d+:number>([\s\S]*?)<\/ax\d+:number>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'balance', /<ax\d+:balance>([\s\S]*?)<\/ax\d+:balance>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', '__tariff'], /<ax\d+:currency>([\s\S]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
    getParam(info, result, 'minpaytill', /<ax\d+:nextCreditPaymentDate>([\s\S]*?)<\/ax\d+:nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
    getParam(html, result, 'minpay', /<ax\d+:minimalCreditPayment>([\s\S]*?)<\/ax\d+:minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'limit', /<ax\d+:creditLimit>([\s\S]*?)<\/ax\d+:creditLimit>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'till', /<ax\d+:closeDate>([\s\S]*?)<\/ax\d+:closeDate>/i, replaceTagsAndSpaces, parseDateISO);

    if(AnyBalance.isAvailable('all')){
        var all = sumParam(html, null, null, /<ns:return[^>]*>([\s\S]*?)<\/ns:return>/ig);
        var out = [];
        for(var i=0; i<all.length; ++i){
            var info = all[i];
            var accnum = getParam(info, null, null, /<ax\d+:number>([\s\S]*?)<\/ax\d+:number>/i, replaceTagsAndSpaces, html_entity_decode);
            var balance = getParam(info, null, null, /<ax\d+:balance>([\s\S]*?)<\/ax\d+:balance>/i, replaceTagsAndSpaces, parseBalance);
            var currency = getParam(info, null, null, /<ax\d+:currency>([\s\S]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, html_entity_decode);
            out.push(accnum + ': ' + balance + ' ' + currency);
        }
        result.all = out.join('\n');
    }
}

function fetchDeposit(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние цифры интересующего вас счета или не вводите ничего, чтобы получить информацию по первому счету');
    html = AnyBalance.requestPost(baseurl + 'RCDepositService', g_xml_accounts, addHeaders({SOAPAction: 'urn:GetDeposits'})); 
   
    var re = new RegExp('<ns:return[^>]*>((?:[\\s\\S](?!</ns:return>))*?<ax\\d+:accountNumber>\\d+' + (prefs.num ? prefs.num : '') + '</ax\\d+:accountNumber>[\\s\\S]*?)</ns:return>', 'i');
    var info = getParam(html, null, null, re);
    if(!info)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счета с последними цифрами ' + prefs.num : 'Не найдено ни одного счета');

    getParam(info, result, 'accnum', /<ax\d+:accountNumber>([\s\S]*?)<\/ax\d+:accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'balance', /<ax\d+:initialAmount>([\s\S]*?)<\/ax\d+:initialAmount>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', '__tariff'], /<ax\d+:currency>[^<]*?([^<\.]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
    getParam(info, result, '__tariff', /<ax\d+:names>([\s\S]*?)<\/ax\d+:names>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'rate', /<ax\d+:interestRate>([\s\S]*?)<\/ax\d+:interestRate>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'pcts', /<ax\d+:totalInterest>([\s\S]*?)<\/ax\d+:totalInterest>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'till', /<ax\d+:closeDate>([\s\S]*?)<\/ax\d+:closeDate>/i, replaceTagsAndSpaces, parseDateISO);

    if(AnyBalance.isAvailable('all')){
        var all = sumParam(html, null, null, /<ns:return[^>]*>([\s\S]*?)<\/ns:return>/ig);
        var out = [];
        for(var i=0; i<all.length; ++i){
            var info = all[i];
            var accnum = getParam(info, null, null, /<ax\d+:accountNumber>([\s\S]*?)<\/ax\d+:accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
            var balance = getParam(info, null, null, /<ax\d+:initialAmount>([\s\S]*?)<\/ax\d+:initialAmount>/i, replaceTagsAndSpaces, parseBalance);
            var currency = getParam(info, null, null, /<ax\d+:currency>[^<]*?([^<\.]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, html_entity_decode);
            out.push(accnum + ': ' + balance + ' ' + currency);
        }
        result.all = out.join('\n');
    }
}

function fetchCredit(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();
	
    html = AnyBalance.requestPost(baseurl + 'RCLoanService', g_xml_accounts, addHeaders({SOAPAction: 'urn:GetLoans'})); 
	
	getParam(html, result, 'rate', /<ax\d+:intrestRate>([\s\S]*?)<\/ax\d+:intrestRate>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred_ammount', /<ax\d+:loanAmount>([\s\S]*?)<\/ax\d+:loanAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /<ax\d+:paymentRest>([\s\S]*?)<\/ax\d+:paymentRest>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'minpay', /<ax\d+:nextPaymentAmount>([\s\S]*?)<\/ax\d+:nextPaymentAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'paid', /<ax\d+:paidLoanAmount>([\s\S]*?)<\/ax\d+:paidLoanAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', '__tariff'], /<ax\d+:currency>[^<]*?([^<\.]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
	getParam(html, result, 'minpaytill', /<ax\d+:nextPaymentDate>([\s\S]*?)<\/ax\d+:nextPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'till', /<ax\d+:closeDate>([\s\S]*?)<\/ax\d+:closeDate>/i, replaceTagsAndSpaces, parseDateISO);
	
    /*if(AnyBalance.isAvailable('all'))
	{
        var all = sumParam(html, null, null, /<ns:return[^>]*>([\s\S]*?)<\/ns:return>/ig);
        var out = [];
        for(var i=0; i<all.length; ++i){
            var info = all[i];
            var accnum = getParam(info, null, null, /<ax\d+:accountNumber>([\s\S]*?)<\/ax\d+:accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
            var balance = getParam(info, null, null, /<ax\d+:initialAmount>([\s\S]*?)<\/ax\d+:initialAmount>/i, replaceTagsAndSpaces, parseBalance);
            var currency = getParam(info, null, null, /<ax\d+:currency>[^<]*?([^<\.]*?)<\/ax\d+:currency>/i, replaceTagsAndSpaces, html_entity_decode);
            out.push(accnum + ': ' + balance + ' ' + currency);
        }
        result.all = out.join('\n');
    }*/
}

/** Приводим все к единому виду вместо ИВаНов пишем Иванов */
function capitalFirstLenttersDecode(str) {
	str = html_entity_decode(str+'');
	var wordSplit = str.toLowerCase().split(' ');
	var wordCapital = '';
	for (i = 0; i < wordSplit.length; i++) {
		wordCapital += wordSplit[i].substring(0, 1).toUpperCase() + wordSplit[i].substring(1) + ' ';
	}
	return wordCapital.replace(/^\s+|\s+$/g, '');;
}

/** Приводим все к единому виду вместо RuR пишем RUR */
function toUpperCaseMy(str) {
	return html_entity_decode(str+'').toUpperCase();
}