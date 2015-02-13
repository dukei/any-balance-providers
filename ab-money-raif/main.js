/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/xml',
	'Content-Type': 'text/xml',
	'Connection': 'keep-alive',
	'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.4.2; sdk Build/KK) Android/3.0.2(302)'
};

var g_xml_login = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:login><login>%LOGIN%</login><password>%PASSWORD%</password></ser:login></soapenv:Body></soapenv:Envelope>',
	g_xml_accounts = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetAccounts /></soapenv:Body></soapenv:Envelope>',
	g_xml_cards = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetCards /></soapenv:Body></soapenv:Envelope>',
	g_xml_loans = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetLoans /></soapenv:Body></soapenv:Envelope>',
	g_xml_deposits = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetDeposits /></soapenv:Body></soapenv:Envelope>';
	g_xml_UITAccounts  = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetUITAccounts /></soapenv:Body></soapenv:Envelope>';

function translateError(error) {
	var errors = {
		'logins.password.incorrect': 'Неправильный логин или пароль',
		'profile.login.first_entry': 'Это ваш первый вход в Райффайзен.Connect. Пожалуйста, зайдите в https://connect.raiffeisen.ru через браузер и установите постоянный пароль',
		'profile.login.expired': 'Уважаемый клиент, срок действия Вашего пароля истёк, так как Вы не меняли Ваше имя пользователя и/или пароль в течение последних 180 дней. Для доступа к системе требуется изменить ваше имя пользователя и/или пароль на новые значения.',
	};
	if (errors[error]) 
		return errors[error];
	
	AnyBalance.trace('Неизвестная ошибка: ' + error);
	return error;
}

function html_encode(str) {
	return str.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
	checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');
	
	var baseurl = 'https://connect.raiffeisen.ru/Mobile-WS/services/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestPost(baseurl + 'RCAuthorizationService', g_xml_login.replace(/%LOGIN%/g, html_encode(prefs.login)).replace(/%PASSWORD%/g, html_encode(prefs.password)), addHeaders({SOAPAction: ''}));
	
	if (!/<name>/i.test(html)) {
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
	
	getParam(html, result, 'fio', /<name>([\s\S]*?)<\/name>/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	
	if (prefs.type == 'card') 
		fetchCard(baseurl, html, result);
	else if (prefs.type == 'acc') 
		fetchAccount(baseurl, html, result);
	else if (prefs.type == 'dep') 
		fetchDeposit(baseurl, html, result);
	else if (prefs.type == 'cred') 
		fetchCredit(baseurl, html, result);
	else if (prefs.type == 'uit') 
		fetchUITAccounts(baseurl, html, result);		
	else 
		fetchAccount(baseurl, html, result);
	
	AnyBalance.setResult(result);
}

function fetchUITAccounts(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    // if(prefs.num && !/^\d{4}$/.test(prefs.num))
        // throw new AnyBalance.Error('Введите последние 4 цифры интересующей вас карты или не вводите ничего, чтобы получить информацию по первой карте');

    html = AnyBalance.requestPost(baseurl + 'RCUITService', g_xml_UITAccounts, addHeaders({SOAPAction: ''})); 
   
    var re = new RegExp('<return[^>]*>((?:[\\s\\S](?!</return>))*?<number>[^<]*' + (prefs.num ? prefs.num : '\\d{4}') + '</number>[\\s\\S]*?)</return>', 'i');
    var info = getParam(html, null, null, re);
    if(!info)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не найдено ни одной карты');
	
	// подробности
	//<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><soapenv:Envelope xmlns:xsd="http://entry.rconnect/xsd" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.rconnect" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Header /><soapenv:Body><ser:GetUITRequests><account><accountNumber>RC1FLP11902         </accountNumber><uitName>[Райффайзен – США, Raiffeisen - USA]</uitName><uitLink>http://www.rcmru.ru/fonds/unitinvestmenttrust/openfonds/funds/graphics/</uitLink><lastModifiedDate>2015-01-15T00:00:00</lastModifiedDate><unitPrice>32043.71</unitPrice><unitPriceSummary>276368.35</unitPriceSummary><unitQuantity>8.62473</unitQuantity></account></ser:GetUITRequests></soapenv:Body></soapenv:Envelope>
	
	getParam(info, result, 'type', /<type>([\s\S]*?)<\/type>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'cardnum', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, '__tariff', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'accnum', /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'balance', /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, ['currency', '__tariff'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'minpaytill', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'till', /<expirationDate>([\s\S]*?)<\/expirationDate>/i, replaceTagsAndSpaces, parseDateISO);
	
	if (AnyBalance.isAvailable('all')) {
		var all = sumParam(html, null, null, /<return[^>]*>([\s\S]*?)<\/return>/ig);
		var out = [];
		for (var i = 0; i < all.length; ++i) {
			var info = all[i];
			var accnum = getParam(info, null, null, /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
			var balance = getParam(info, null, null, /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
			var currency = getParam(info, null, null, /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, html_entity_decode);
			out.push(accnum + ': ' + balance + ' ' + currency);
		}
		result.all = out.join('\n');
	}
}


function fetchCard(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующей вас карты или не вводите ничего, чтобы получить информацию по первой карте');

    html = AnyBalance.requestPost(baseurl + 'RCCardService', g_xml_cards, addHeaders({SOAPAction: ''})); 
   
    var re = new RegExp('<return[^>]*>((?:[\\s\\S](?!</return>))*?<number>[^<]*' + (prefs.num ? prefs.num : '\\d{4}') + '</number>[\\s\\S]*?)</return>', 'i');
    var info = getParam(html, null, null, re);
    if(!info)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не найдено ни одной карты');
	
	getParam(info, result, 'type', /<type>([\s\S]*?)<\/type>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'cardnum', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, '__tariff', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'accnum', /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'balance', /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, ['currency', '__tariff'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'minpaytill', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(info, result, 'minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'till', /<expirationDate>([\s\S]*?)<\/expirationDate>/i, replaceTagsAndSpaces, parseDateISO);
	
	if (AnyBalance.isAvailable('all')) {
		var all = sumParam(html, null, null, /<return[^>]*>([\s\S]*?)<\/return>/ig);
		var out = [];
		for (var i = 0; i < all.length; ++i) {
			var info = all[i];
			var accnum = getParam(info, null, null, /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
			var balance = getParam(info, null, null, /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
			var currency = getParam(info, null, null, /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, html_entity_decode);
			out.push(accnum + ': ' + balance + ' ' + currency);
		}
		result.all = out.join('\n');
	}
}

function fetchAccount(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние цифры интересующего вас счета или не вводите ничего, чтобы получить информацию по первому счету');
    html = AnyBalance.requestPost(baseurl + 'RCAccountService', g_xml_accounts, addHeaders({SOAPAction: ''})); 
   
    var re = new RegExp('<return[^>]*>((?:[\\s\\S](?!</return>))*?<number>\\d*' + (prefs.num ? prefs.num : '') + '</number>[\\s\\S]*?)</return>', 'i');
    var info = getParam(html, null, null, re);
    if(!info)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счета с последними цифрами ' + prefs.num : 'Не найдено ни одного счета');

    getParam(info, result, '__tariff', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'accnum', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'balance', /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', '__tariff'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
    getParam(info, result, 'minpaytill', /<nextCreditPaymentDate>([\s\S]*?)<\/nextCreditPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
    getParam(html, result, 'minpay', /<minimalCreditPayment>([\s\S]*?)<\/minimalCreditPayment>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'limit', /<creditLimit>([\s\S]*?)<\/creditLimit>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDateISO);

    if(AnyBalance.isAvailable('all')){
        var all = sumParam(html, null, null, /<return[^>]*>([\s\S]*?)<\/return>/ig);
        var out = [];
        for(var i=0; i<all.length; ++i){
            var info = all[i];
            var accnum = getParam(info, null, null, /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
            var balance = getParam(info, null, null, /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
            var currency = getParam(info, null, null, /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, html_entity_decode);
            out.push(accnum + ': ' + balance + ' ' + currency);
        }
        result.all = out.join('\n');
    }
}

'40817810801001355423: 337425.17 rur\
40817840401002355423: 19614.44 usd\
40817840101001355423: 17333.41 usd\
40817840801000355423: 21816.81 usd\
40817810101002355423: 430947.82 rur'

function fetchDeposit(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();
	
	if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние цифры интересующего вас счета или не вводите ничего, чтобы получить информацию по первому счету');
    html = AnyBalance.requestPost(baseurl + 'RCDepositService', g_xml_deposits, addHeaders({SOAPAction: ''})); 
   
    var re = new RegExp('<return[^>]*>((?:[\\s\\S](?!</return>))*?<accountNumber>\\d*' + (prefs.num ? prefs.num : '') + '</accountNumber>[\\s\\S]*?)</return>', 'i');
    var info = getParam(html, null, null, re);
    if(!info)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счета с последними цифрами ' + prefs.num : 'Не найдено ни одного счета');

    getParam(info, result, 'accnum', /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'balance', /<initialAmount>([\s\S]*?)<\/initialAmount>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', '__tariff'], /<currency>[^<]*?([^<\.]*?)<\/currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
    getParam(info, result, '__tariff', /<names>([\s\S]*?)<\/names>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(info, result, 'rate', /<interestRate>([\s\S]*?)<\/interestRate>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'pcts', /<totalInterest>([\s\S]*?)<\/totalInterest>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDateISO);

    if(AnyBalance.isAvailable('all')){
        var all = sumParam(html, null, null, /<return[^>]*>([\s\S]*?)<\/return>/ig);
        var out = [];
        for(var i=0; i<all.length; ++i){
            var info = all[i];
            var accnum = getParam(info, null, null, /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces, html_entity_decode);
            var balance = getParam(info, null, null, /<initialAmount>([\s\S]*?)<\/initialAmount>/i, replaceTagsAndSpaces, parseBalance);
            var currency = getParam(info, null, null, /<currency>[^<]*?([^<\.]*?)<\/currency>/i, replaceTagsAndSpaces, html_entity_decode);
            out.push(accnum + ': ' + balance + ' ' + currency);
        }
        result.all = out.join('\n');
    }
}

function fetchCredit(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();
	
    html = AnyBalance.requestPost(baseurl + 'RCLoanService', g_xml_loans, addHeaders({SOAPAction: ''})); 
	
	getParam(html, result, 'rate', /<intrestRate>([\s\S]*?)<\/intrestRate>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred_ammount', /<loanAmount>([\s\S]*?)<\/loanAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /<paymentRest>([\s\S]*?)<\/paymentRest>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'minpay', /<nextPaymentAmount>([\s\S]*?)<\/nextPaymentAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'paid', /<paidLoanAmount>([\s\S]*?)<\/paidLoanAmount>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', '__tariff'], /<currency>[^<]*?([^<\.]*?)<\/currency>/i, replaceTagsAndSpaces, toUpperCaseMy);
	getParam(html, result, 'minpaytill', /<nextPaymentDate>([\s\S]*?)<\/nextPaymentDate>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDateISO);
	
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