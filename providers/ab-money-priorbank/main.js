/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'PriorMobile3/3.44.3 (Android 26; versionCode 136)',
	'Connection': 'Keep-Alive'
};

var g_baseurl = 'https://www.prior.by/api3/api/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 ($2) $3-$4-$5'];

function callApi(verb, postParams){
	var method = 'GET';
	var h = g_headers;
	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json; charset=utf-8'}, h);
	}
	AnyBalance.trace('Запрос: ' + g_baseurl + verb);
	var html = AnyBalance.requestPost(g_baseurl + verb, postParams && JSON.stringify(postParams), h, {HTTP_METHOD: method});
	
	if(!html||AnyBalance.getLastStatusCode() > 500) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сервер API временно недоступен. Попробуйте еще раз позже');
    }
	
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.message || (isset(json.success) && !json.success)){
		var error = json.message || json.errorMessage;
		AnyBalance.trace(html);
		throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
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
		deviceInfo: {"precognitiveSessionId": ""},
		password2: null,
		lang: 'RUS'
	});

    if(!json || !json.access_token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }
	
	g_headers.Authorization = tokenInfo.token_type + ' ' + json.access_token;
	AnyBalance.trace('Вошли как ' + json.clientName + ' ' + json.secondName + ' ' + json.surname);

	var result = {success: true};

	if(prefs.type == 'card')
		fetchCard(json, result);
	else
		fetchContract(json, result);
	
	if(AnyBalance.isAvailable('regdate', 'phone', 'fio'))
	    getUserInfo(json, result);
	
	AnyBalance.setResult(result);
}

function fetchCard(json, result) {
	var prefs = AnyBalance.getPreferences();

	var json = callApi('Cards', {"userSession": json.userSession});
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
		throw new AnyBalance.Error('Не удалось найти карту с псевдонимом или последними цифрами ' + prefs.num); 
	
	getParam(card.balance.available, result, 'balance');
	getParam(card.balance.totalBalance, result, 'totalBalance');
	getParam(card.balance.ownBlance, result, 'ownBalance');
	getParam(card.balance.blocked, result, 'blocked');
	getParam(card.balance.crLimit, result, 'creditLimit');
	getParam(card.clientObject.currIso, result, ['currency', 'balance', 'totalBalance', 'ownBalance', 'blocked', 'creditLimit']);
	getParam(card.clientObject.customSynonym || card.clientObject.defaultSynonym, result, 'name');
	getParam(card.clientObject.cardMaskedNumber, result, 'cardNumber');
	getParam(card.clientObject.cardMaskedNumber, result, '__tariff');
	getParam(card.clientObject.openDate, result, 'openDate', null, null, parseDateISO);
	getParam(card.clientObject.expDate, result, 'validto', null, null, parseDateISO);
	getParam(card.clientObject.cardStatusName, result, 'status');
	getParam(card.clientObject.typeName, result, 'type');
	getParam(card.clientObject.cardTypeName, result, 'cardType');
	getParam(card.clientObject.repaymentProgress, result, 'repaymentProgress');
	
	return result;
}

function fetchContract(json, result) {
	var prefs = AnyBalance.getPreferences();

	var json = callApi('Contracts', {"userSession": json.userSession});
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
		throw new AnyBalance.Error('Не удалось найти контракт с псевдонимом или последними цифрами ' + prefs.num); 

	var cont_status = {1: 'Действует', 0: 'Закрыт'};
	
	getParam(card.balance.available, result, 'balance');
	getParam(card.balance.totalBalance, result, 'totalBalance');
	getParam(card.balance.ownBlance, result, 'ownBalance');
	getParam(card.balance.blocked, result, 'blocked');
	getParam(card.balance.crLimit, result, 'creditLimit');
	getParam(card.clientObject.currIso, result, ['currency', 'balance', 'totalBalance', 'ownBalance', 'blocked', 'creditLimit']);
	getParam(card.clientObject.customSynonym || card.clientObject.defaultSynonym, result, 'name');
	getParam(card.clientObject.contractNum, result, 'cardNumber');
	getParam(card.clientObject.contractNum, result, '__tariff');
	getParam(card.clientObject.openDate, result, 'openDate', null, null, parseDateISO);
	getParam(card.clientObject.contractCloseDate, result, 'validto', null, null, parseDateISO);	
	getParam(cont_status[card.clientObject.isOpen]||card.clientObject.isOpen, result, 'status');
	getParam(card.clientObject.typeName, result, 'type');
	getParam(card.clientObject.contractTypeName, result, 'cardType');
	getParam(card.clientObject.repaymentProgress, result, 'repaymentProgress');
	if(result.validto && result.validto < 0)
		delete result.validto;

	return result;
}

function getUserInfo(json, result) {
	var prefs = AnyBalance.getPreferences();
	
	var json = callApi('Membership/UserInfo', {"userSession": json.userSession});
	
	var person = {};
	sumParam(json.clientName, person, '__n', null, null, null, create_aggregate_join(' '));
	sumParam(json.secondName, person, '__n', null, null, null, create_aggregate_join(' '));
	sumParam(json.surname, person, '__n', null, null, null, create_aggregate_join(' '));
	getParam(person.__n, result, 'fio', null, null, capitalFirstLetters);
	
	getParam(json.dateReg, result, 'regdate', null, null, parseDateISO);
	getParam(json.phone, result, 'phone', null, replaceNumber);
	
	return result;
}
