/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'PriorMobile3/3.17.03.22 (Android 26; versionCode 37)',
	Connection: 'Keep-Alive'
};

var g_baseurl = 'https://www.prior.by/api3/api/';


function callApi(verb, postParams){
	var method = 'GET';
	var h = g_headers;
	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json; charset=utf-8'}, h);
	}
	
	var html = AnyBalance.requestPost(g_baseurl + verb, postParams && JSON.stringify(postParams), h, {HTTP_METHOD: method});

	var json = getJson(html);
	if(isset(json.success) && !json.success){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.errorMessage, null, /парол/i.test(json.errorMessage));
	}

	if(json.success)
		return json.result;

    return json;
}


function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var tokenInfo = callApi('Authorization/MobileToken');
	g_headers.client_id = tokenInfo.client_secret;
	g_headers.Authorization = tokenInfo.token_type + ' ' + tokenInfo.access_token;

	var salt = callApi('Authorization/GetSalt', {lang: 'RUS', login: prefs.login});
	AnyBalance.trace('Salt is: ' + JSON.stringify(salt));  
	var passHash = CryptoJS.SHA512(prefs.password).toString();
	if(salt.salt)
		passHash = CryptoJS.SHA512(passHash + salt.salt).toString();

	var json = callApi('Authorization/Login', {
		login: prefs.login,
		password: passHash,
		lang: 'RUS'
	});

	g_headers.Authorization = tokenInfo.token_type + ' ' + json.access_token;
	AnyBalance.trace('Вошли как ' + json.clientName + ' ' + json.secondName + ' ' + json.surname);
	
	var result = {success: true};

	if(prefs.type == 'card')
		fetchCard(json, result);
	else
		fetchContract(json, result);
	
	AnyBalance.setResult(result);
}

function fetchCard(json, result) {
	var prefs = AnyBalance.getPreferences();

	var json = callApi('Cards', {userSession: json.userSession});
	if(!json || !json.length)
		throw new AnyBalance.Error('У вас нет ни одной карты');

	AnyBalance.trace('Найдено карт: ' + json.length);

	var card;
	for(var i=0; i<json.length; ++i){
		card = json[i];
		var syn = card.clientObject.customSynonym || card.clientObject.defaultSynonym;
		AnyBalance.trace('Найдена карта ' + syn + ' (' + card.clientObject.cardMaskedNumber + ')');
		if(!prefs.num || endsWith(card.clientObject.cardMaskedNumber, prefs.num) || endsWith(syn, prefs.num))
			break;
	}

	if(i > json.length)
		throw new AnyBalance.Error('Не удаётся найти карту с псевдонимом или последними цифрами ' + prefs.num); 

	getParam(card.balance.available, result, 'balance');
	getParam(card.clientObject.currIso, result, ['currency', 'balance']);
	getParam(card.clientObject.customSynonym || card.clientObject.defaultSynonym, result, 'name');
	getParam(card.clientObject.cardMaskedNumber, result, 'cardNumber');
	getParam(card.clientObject.cardMaskedNumber, result, '__tariff');
	getParam(card.clientObject.expDate, result, 'validto', null, null, parseDateISO);
	
	return result;
}

function fetchContract(json, result) {
	var prefs = AnyBalance.getPreferences();

	var json = callApi('Contracts', {userSession: json.userSession});
	if(!json || !json.length)
		throw new AnyBalance.Error('У вас нет ни одного контракта');

	AnyBalance.trace('Найдено контрактов: ' + json.length);

	var card;
	for(var i=0; i<json.length; ++i){
		card = json[i];
		var syn = card.clientObject.customSynonym || card.clientObject.defaultSynonym;
		AnyBalance.trace('Найден контракт ' + syn + ' (' + card.clientObject.contractNum + ')');
		if(!prefs.num || endsWith(card.clientObject.contractNum, prefs.num) || endsWith(syn, prefs.num))
			break;
	}

	if(i > json.length)
		throw new AnyBalance.Error('Не удаётся найти контракт с псевдонимом или последними цифрами ' + prefs.num); 

	getParam(card.balance.available, result, 'balance');
	getParam(card.clientObject.currIso, result, ['currency', 'balance']);
	getParam(card.clientObject.customSynonym || card.clientObject.defaultSynonym, result, 'name');
	getParam(card.clientObject.contractNum, result, 'cardNumber');
	getParam(card.clientObject.contractNum, result, '__tariff');
	getParam(card.clientObject.contractCloseDate, result, 'validto', null, null, parseDateISO);	
	if(result.validto && result.validto < 0)
		delete result.validto;

	return result;
}
