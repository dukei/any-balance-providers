/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'application/json; charset=UTF-8',
	'X-Sbol-OS': 'android',
	'X-Sbol-Version': '1.4.2',
	'X-Sbol-Id': '',
	'Connection': 'Keep-Alive',
	'User-Agent': 'okhttp/3.6.0',
	'Accept-Encoding': 'gzip',
	'Origin': null,
};

var baseurl = 'https://digital.bps-sberbank.by/SBOLServer/';

function apiCall(action, params, addOnHeaders) {
	var apiHeaders = g_headers;
	if(typeof params === 'string')
		apiHeaders = addHeaders({'Content-Type': 'application/json; charset=UTF-8'});
	
	var html = AnyBalance.requestPost(baseurl + action, params, addOnHeaders ? addHeaders(apiHeaders, addOnHeaders) : apiHeaders, {HTTP_METHOD: params ? 'POST' : 'GET'});
	
	if(!html) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить ответ от сервера.');
	}
	
	var json = getJson(html);

	if(json.error || (json.errorInfo && +json.errorInfo.errorCode)) {
		if(getLastResponseHeader('sbol-status') === 'new_device')
			return json;

		var error = json.error_description || (json.errorInfo && json.errorInfo.errorDescription);

		AnyBalance.trace(html);
		throw new AnyBalance.Error(error, null, /unauthorized/i.test(json.error + error));
	}
	
	return json;
}

function getLastResponseHeader(name){
	var headers = AnyBalance.getLastResponseHeaders();
	name = name.toLowerCase();
	for(var i=0; i<headers.length; ++i){
		var header = headers[i];
		if(header[0].toLowerCase() === name)
			return header[1];
	}
	return;
}

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(!g_headers.Authorization || !/Bearer/i.test(g_headers.Authorization)){
		g_headers['X-Sbol-Id'] = hex_md5(prefs.login).substr(0, 16);
		g_headers.Authorization = 'Basic ' + Base64.encode(prefs.login + ':' + prefs.password);
	    
		var json = apiCall('oauth/token', {
			client_id: prefs.login,
			client_secret: prefs.password,
			grant_type: 'client_credentials'
		}, {
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
		});

		if(json.error){
			if(getLastResponseHeader('sbol-status') === 'new_device'){
				AnyBalance.trace('Требуется подтверждение устройства');
				var uid = getLastResponseHeader('sbol-udid');
				
				json = apiCall('rest/registration/prepareDevice', JSON.stringify({
					"udId":uid
				}));

				var code = AnyBalance.retrieveCode('Пожалуйста, подтвердите разрешение AnyBalance входить в интернет-банк БПС-Сбербанк, введя код из SMS',
				    null, {inputType: 'number', time: 300000});

				json = apiCall('rest/registration/trustedDevice', JSON.stringify({
					"smsCode":code,
					"udId":uid
				}));

				json = apiCall('oauth/token', {
					client_id: prefs.login,
					client_secret: prefs.password,
					grant_type: 'client_credentials'
				}, {
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
				});

			}else{
				AnyBalance.trace(JSON.stringify(json));
				throw new AnyBalance.Error('Неизвестная ошибка входа. Сайт изменен?');
			}
		}
	    
		g_headers.Authorization = 'Bearer ' + json.access_token;
	    
        __setLoginSuccessful();
    }else{
    	AnyBalance.trace('Already logged in');
    }
}

function getProducts(){
	if(!getProducts.products)
		getProducts.products = apiCall('rest/client/contracts');
	return getProducts.products;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(xml, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var json = getProducts();

	var accounts = json.contracts;
	if(!accounts){
		AnyBalance.trace('Не удалось найти счета ' + JSON.stringify(json));
		return;
	}

	AnyBalance.trace('Найдено ' + accounts.length + ' счетов');

	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var id = acc.contractId;
		var num = acc.account || acc.contractNumber;
		var name = acc.name;

		var title = name + ' ' + num.substr(-4);
		
		var c = {__id: id, __name: title, num: num, name: name};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function requestCardBalance(cardHash, currency){
	var hashes = requestCardBalance.hashes || {};
	if(hashes[cardHash])
		return hashes[cardHash];

    var dt = new Date();
    var params = joinObjects(g_baseparams, {
    	CARDHASH: cardHash,
    	CURRENCY_NUM: currency,
    	CURTIME: '' + dt.getFullYear() + n2(dt.getMonth()+1) + n2(dt.getDate()) + n2(dt.getHours()) + n2(dt.getMinutes()) + n2(dt.getSeconds())
    });
    var ret = makeRequest('cardBalance', params);
    ret = getElement(ret, /<ns2:result[^>]*>/i, replaceTagsAndSpaces);
    AnyBalance.trace('Got card response: ' + ret);
    hashes[cardHash] = ret;
    requestCardBalance.hashes = hashes;
    return ret;
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account.contractType, result, 'accounts.type'); //1 - карточный счет?
//    getParam(account, result, 'accounts.status', /<status[^>]*>([\s\S]*?)<\/status>/i, replaceTagsAndSpaces); //0 - активный?
    getParam(account.currencyName, result, ['accounts.currency', 'accounts.balance']); 
    getParam(account.dateStart, result, 'accounts.date_start'); 
    getParam(account.percentRate, result, 'accounts.pct'); 

    getParam(account.amount, result, 'accounts.balance');
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(xml, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    var json = getProducts();

	var accounts = json.contracts.filter(function(e) { return e.cardList && e.cardList.length });
	if(!accounts.length){
		AnyBalance.trace(JSON.stringify(json));
		AnyBalance.trace('Не удалось найти карточные счета');
		return;
	}

	AnyBalance.trace('Найдено ' + accounts.length + ' карточных счетов');

	result.cards = [];
	
	for(var i=0; i <accounts.length; ++i){
        var acc = accounts[i];
		AnyBalance.trace('Счет ' + acc.account + ' содержит ' + acc.cardList.length + ' карт');
        for (var j=0; j<acc.cardList.length; ++j){
        	var card = acc.cardList[j];

        	var id = card.cardId;
        	var num = card.panCode;
        	var name = card.name;
        	var title = card.name + ' ' + num.substr(-4)

			var c = {__id: id, __name: title, num: num, accnum: acc.account, name: name, accid: acc.contractId};
		    
			if (__shouldProcess('cards', c)) {
				processCard(card, c, acc);
			}

			result.cards.push(c);

        }

	}
}

function processCard(card, result, acc) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card.name, result, 'cards.type'); 
//    getParam(c, result, 'cards.type_code', /<cardType[^>]*>([\s\S]*?)<\/cardType>/i, replaceTagsAndSpaces); 
    getParam(card.status, result, 'cards.status'); //0 - активный?
    getParam(card.monthEnd + '/' + card.yearEnd, result, 'cards.till', null, replaceTagsAndSpaces, parseDate); 
    getParam(acc.currencyName, result, ['cards.currency', 'cards.balance']); 
    getParam(acc.amount, result, 'cards.balance'); 

    if(AnyBalance.isAvailable('cards.balance')){
    	try{
    		var end = card.yearEnd + '-' + card.monthEnd + '-15';
    		var json = apiCall('rest/client/balance', JSON.stringify({
    			cardExpire: end,
    			cardId: card.cardId,
    			currency: acc.currencyCode
    		}));
    	    
    		getParam(json.amount, result, 'cards.balance');
    	}catch(e){
    		AnyBalance.trace('Невозможно получить актуальный баланс для карты ' + result.__name + '. Заблокирована? Получаем баланс из счета.');
    	}
    }

	if(isAvailable('cards.transactions'))
		processCardTransactions(card, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;
}

function processDeposit(html, result, detailsJson) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(xml, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

	throw AnyBalance.Error('Ошибка получения кредитов. Сайт изменен?');

    xml = getProducts();

	var credits = getElement(xml, /<credits[^>\/]*>/i);
	if(!credits){
		if(/<credits\s*\/>/i.test(xml)){
			credits = '';
		}else{
			AnyBalance.trace(xml);
			AnyBalance.trace('Не удалось найти кредиты');
			return;
		}
	}

	credits = getElements(credits, /<credit[^>]*>/ig);
	AnyBalance.trace('Найдено ' + credits.length + ' кредитов');

	result.credits = [];
	
	for(var i=0; i < credits.length; ++i){
		var credit = credits[i];

		var id = getElement(credit, /<contract_id[^>]*>/i, replaceTagsAndSpaces);
		var num = getElement(credit, /<contractNumber[^>]*>/i, replaceTagsAndSpaces);
		var name = getElement(credit, /<contract_name[^>]*>/i, replaceTagsAndSpaces);
		var title = name + ' ' + num.substr(-4);
		
		var c = {__id: id, __name: title, num: num, name: name};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credit, c);
		}
		
		result.credits.push(c);
	}
}

function processCredit(credit, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);

    getParam(credit, result, 'credits.status', /<status[^>]*>([\s\S]*?)<\/status>/i, replaceTagsAndSpaces); //0 - активный?
    getParam(credit, result, 'credits.date_start', /<contract_date[^>]*>([\s\S]*?)<\/contract_date>/i, replaceTagsAndSpaces, parseDateISO); 
    getParam(credit, result, 'credits.till', /<contract_close_date[^>]*>([\s\S]*?)<\/contract_close_date>/i, replaceTagsAndSpaces, parseDateISO); 
    getParam(credit, result, ['credits.currency', 'credits.balance'], /<currency[^>]*>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, CurrencyISO.digitsToLetters); 
    getParam(credit, result, 'credits.balance', /<residualAmount[^>]*>([\s\S]*?)<\/residualAmount>/i, replaceTagsAndSpaces, parseBalance); 
    getParam(credit, result, 'credits.accid', /<relatedAccount[^>]*>([\s\S]*?)<\/relatedAccount>/i, replaceTagsAndSpaces); 
    getParam(credit, result, 'credits.limit', /<overdraftLimit[^>]*>([\s\S]*?)<\/overdraftLimit>/i, replaceTagsAndSpaces, parseBalance); 
    getParam(credit, result, 'credits.pct', /<percRate[^>]*>([\s\S]*?)<\/percRate>/i, replaceTagsAndSpaces, parseBalance); 

    if(AnyBalance.isAvailable('credits.transactions')) {
        processCreditTransactions(credit, result);
    }
}

function processInfo(json, result){
    var info = result.info = {};

    json = apiCall('rest/user/updateProfile', JSON.stringify({}));

    getParam(json.lastName + ' ' + json.firstName + ' ' + json.middleName, info, 'info.fio');
    getParam(json.passport, info, 'info.passport');
    getParam(json.birthday, info, 'info.birthday');
}
