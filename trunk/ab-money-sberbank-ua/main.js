/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
/*	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',*/
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6,uk;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://online.oschadbank.ua',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.66 Safari/537.36 OPR/25.0.1614.31 (Edition beta)',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.oschadbank.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введіть логін!');
	checkEmpty(prefs.password, 'Введіть пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'wb/', g_headers);
	
	var execKey = getParam(html, null, null, /execution=([\s\S]{4})/i);

  
	var href = getParam(html, null, null, /id="FORM_FAST_LOGIN"[^>]*action="\/([^"]*)/i);
	
	var params = createFormParams(html, function(params, str, name, value) {  
  		if (name == 'AUTH_METHOD') 
			return 'FAST_PWA';  
		if (name == 'Login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		else if (name == '_flowExecutionKey')
			return execKey; 
		else if (name == '_eventId')
			return 'submitUserId'; 
    
		return value;
	});
	html = AnyBalance.requestPost(baseurl + href, params, addHeaders({Referer: baseurl + 'wb/auth/userlogin?execution=' + execKey}));

AnyBalance.trace(baseurl + 'wb/auth/userlogin?execution=' + execKey);
                                                                                        
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Смена Пароля(?:[\s\S]*?<[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);
		error = getElement(html, /<div[^>]+form-error[^>]*>/i);
		if(error)
			error = replaceAll(error, [replaceTagsAndSpaces, replaceHtmlEntities]);
		if (error) 
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не вдалося зайти в особистий кабінет. Сайт змінено?');
	}
	if (prefs.type == 'acc') 
		fetchAcc(html, baseurl);
	else 
		fetchCard(html, baseurl);
}

function getSID(html) {
	var sid = getParam(html, null, null, /'SID'[^>]*value='([^']*)/i, replaceTagsAndSpaces, html_entity_decode);
	return sid;
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо вказати 4 останніх цифри карти або не вказувати нічого");
	
	var result = {success: true};
	getParam(html, result, 'fio', /user-name"([^>]*>){4}/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'wb/api/v1/contracts?system=W4C', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
	var json = getJson(html);
	
	for(var i=0; i<json.length; ++i){
		var prod = json[i];
		if(!prod.card)
			continue;
		if(!prefs.lastdigits || endsWith(prod.number, prefs.lastdigits))
			break;
	}

	if(i > json.length){
		AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не вдалося знайти ' + (prefs.lastdigits ? 'карту с останніми цифрами ' + prefs.lastdigits : 'ні однієї карти!'));
	}

    getParam(prod.balances.available.value, result, 'balance', null, null, parseBalance);
    getParam(prod.balances.full_crlimit.value, result, 'maxlimit', null, null, parseBalance);
	getParam(prod.card.expiryDate, result, 'till', null, null, parseDate);
    getParam(prod.balances.total_due.value, result, 'debt', null, null, replaceTagsAndSpaces, parseBalance);
    getParam(prod.card.accountNumber, result, 'rr');
    getParam(prod.balances.available.currency, result, ['currency', 'balance', 'maxlimit', 'debt']);
    getParam(prod.product.name, result, '__tariff');
	getParam(prod.number, result, 'cardNumber');
	
	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо вказати 4 останніх цифри рахунка або не вказувати нічого");
	
	var result = {success: true};
	getParam(html, result, 'fio', /user-name"([^>]*>){4}/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'wb/api/v1/contracts?system=W4C', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
	var json = getJson(html);
	
	for(var i=0; i<json.length; ++i){
		var prod = json[i];
		if(!prod.cardAccount)
			continue;
		if(!prefs.lastdigits || endsWith(prod.number, prefs.lastdigits))
			break;
	}

	if(i > json.length){
		AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не вдалося знайти ' + (prefs.lastdigits ? 'рахунок с останніми цифрами ' + prefs.lastdigits : 'ні однієї карти!'));
	}

    getParam(prod.balances.available.value, result, 'balance', null, null, parseBalance);
    getParam(prod.balances.full_crlimit.value, result, 'maxlimit', null, null, parseBalance);
//	getParam(prod.card.expiryDate, result, 'till', null, null, parseDate);
    getParam(prod.balances.total_due.value, result, 'debt', null, null, parseBalance);
    getParam(prod.cardAccount.accountNumber, result, 'rr');
    getParam(prod.balances.available.currency, result, ['currency', 'balance', 'maxlimit', 'debt']);
    getParam(prod.product.name, result, '__tariff');
//	getParam(prod.number, result, 'cardNumber');
	
	AnyBalance.setResult(result);
}
