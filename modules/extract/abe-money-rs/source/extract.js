/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var baseurl = 'https://online.rsb.ru/';

function callApi(verb, getParams, postParams){
	var method = 'GET';
	var h = {
		DateValue: '' + new Date().getTime(),
		Expires: '0',
		Referer: baseurl,
		Origin: baseurl.replace(/\/$/, ''),
	};

	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json'}, h);
	}
	
	var html = AnyBalance.requestPost(baseurl + 'rest/' + verb + (getParams ? '?' + createUrlEncodedParams(getParams) : ''),
		postParams && JSON.stringify(postParams), addHeaders(h), {HTTP_METHOD: method});

	var code = AnyBalance.getLastStatusCode();
	if(!html && 200 <= code && code < 300)
		return {__empty: true};

	if(html){
		var json = getJson(html);
		if(json.error){
			AnyBalance.trace(html);
			throw new AnyBalance.Error(json.error.description, null, /парол|Unauthorized/i.test(json.error.description));
		}
	    
		if(json.errors){
			var error = json.errors.join('\n');
			AnyBalance.trace(html);
			throw new AnyBalance.Error(error, null, /парол|Unauthorized/i.test(error));
		}
	}

	if(code < 200 || 400 <= code){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(AnyBalance.getLastStatusString());
	}

	return json;
}

function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	var json;

	try{
		json = callApi('common/session/status');
        AnyBalance.trace('Используем существующую сессию...');
		return getProductsJson();
	}catch(e){
		AnyBalance.trace('Автологин не получился: ' + e.message);
	}

	json = callApi('biz/auth/login', null, {
		device: hex_md5(prefs.login),
		password: prefs.password,
		sysName: 'internetbank',
		userName: prefs.login
	});

	if(json.otpId){
		AnyBalance.trace('потребовалось подтверждение по ' + json.confirmType);
		var code = AnyBalance.retrieveCode('Пожалуйста, введите подтверждение, полученное по ' + json.confirmType + '. Если Вы не хотите вводить код каждый раз, отмените запрос кода на вход в настройках интернет-банка https://online.rsb.ru', null, {inputType: 'number', time: 180000});

		json = callApi('biz/auth/login', null, {
			confirmation: {
				otpId: json.otpId,
				otpValue: code
			},
			device: hex_md5(prefs.login),
			password: prefs.password,
			sysName: 'internetbank',
			userName: prefs.login
		});
	}

	if(!json.authorized){
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось войти в интернет банк. Сайт изменен?');
	}

    return getProductsJson();
}

function getProductsJson(){
	if(getProductsJson.cached_json)
		return getProductsJson.cached_json;

	var json = callApi('biz/client-products-sorted');

	return getProductsJson.cached_json = json;

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(json, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var products = json.filter(p => p.productId.productType === 'ACCOUNT');

    AnyBalance.trace('Найдено счетов: ' + products.length);
	result.accounts = [];
	
	for(var i=0; i < products.length; ++i){
        var p = products[i];
		var id = p.productId.contractId;
        var num = p.productNumber;
		var title = p.label + ' ' + num.substr(-4);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(p, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account.label, result, 'accounts.name');
    var json = callApi('biz/account/detail', {id: account.productId.contractId});

    getParam(jspath1(json, '$.availableBalance.amount'), result, 'accounts.balance', null, null, parseBalance);
    getParam(jspath1(json, '$.availableBalance.currency'), result, ['accounts.currency' , 'accounts.balance']);
    getParam(json.contractDate, result, 'accounts.date_start');
    getParam(json.tariffPlanName, result, 'accounts.tariff');
    getParam(json.contractNumber, result, 'accounts.contract');
    getParam(json.currentRate, result, 'accounts.pct');

    if(isAvailable('accounts.num')){
    	json = callApi('biz/account/account-requisites/' + account.productId.contractId);
    	getParam(json[0].accountNumber, result, 'accounts.num');
    }

    if(AnyBalance.isAvailable('accounts.transactions')){
        //getParam(details, result, 'accounts.status', /Состояние[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces); //Открыт

        //processAccountTransactions(html, result);
    }

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(json, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    var products = json.filter(p => p.productId.productType === 'CARD');;

    AnyBalance.trace('Найдено карт: ' + products.length);
    result.cards = [];

    for(var i=0; i < products.length; ++i){
        var p = products[i];

        var id = p.productId.cardId;
        var num = p.productNumber;
        var title = p.label + ' ' + num.substr(-4);


        var c = {__id: id, __name: title, num: num};

        if(__shouldProcess('cards', c)) {
            processCard(p, c);
        }

        result.cards.push(c);
    }
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    var json = callApi('biz/card/detail', {id: card.productId.cardId});

    getParam(jspath1(json, '$.cardAccountBalanceDetailList[0].availableAmount.value.amount'), result, 'cards.balance');
    getParam(jspath1(json, '$.cardAccountBalanceDetailList[0].blockedAmount.value.amount'), result, 'cards.blocked');
    getParam(json.cardNumber, result, 'cards.num');
    //getParam(card.acc[0].own, result, 'cards.own', null, null, parseBalance);
    getParam(jspath1(json, '$.creditLimit.value.amount'), result, 'cards.limit');
    getParam(json.currency, result, ['cards.currency', 'cards.balance', 'cards.blocked', 'cards.own']);

	getParam(json.expiryDate, result, 'cards.till');
    getParam(json.contractSignDate, result, 'cards.date_start', null, null, parseDateISO);
    getParam(json.tariffPlan, result, 'cards.tariff');
    getParam(json.status, result, 'cards.status');

    getParam(jspath1(json, '$.gracePeriodAmount.value.amount'), result, 'cards.gracepay');
    getParam(jspath1(json, '$.minPaymentAmount.value.amount'), result, 'cards.minpay');
    getParam(json.gracePeriodDate, result, 'cards.gracepay_till');

    getParam(json.productId.contractId, result, 'cards.contract');
    getParam(!card.isAdditionalCard, result, 'cards.main');


    if(isAvailable('cards.accnum')){
    	json = callApi('biz/account/account-requisites/' + card.productId.contractId);
    	getParam(json[0].accountNumber, result, 'accounts.accnum');
    }

    if(AnyBalance.isAvailable('cards.transactions')) {
        //processCardTransactions(html, result);
    }

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(json, result) {
    if(!AnyBalance.isAvailable('deposits'))
        return;

    throw new AnyBalance.Error('Депозиты временно не поддерживаются. Обращайтесь к разработчику.');

    var products = [];
    for(var i=0; i<json.data.length; ++i){
        var p = json.data[i];
        if(p.type == 'deposit')
            products.push(p);
    }

    AnyBalance.trace('Найдено депозитов: ' + products.length);
    result.deposits = [];

    for(var i=0; i < products.length; ++i){
        var p = products[i];

        var id = p.id;

        var url = joinUrl(baseurl, p.link);
        AnyBalance.trace('Детали по депозиту находятся по ссылке ' + url);
        var html = AnyBalance.requestGet(url, g_headers);

        var detailsTable = AB.getElement(html, /<table[^>]+prod-balance_var2[^>]*>/, replaceHtmlEntities);

        var num = getParam(detailsTable, null, null, /Номер депозитного счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var contract = getParam(detailsTable, null, null, /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var title = p.title + ' ' + num.substr(-4);

        var c = {__id: id, __name: title, num: num, contract: contract};

        if(__shouldProcess('deposits', c)) {
            processDeposit(p, c, html);
        }

        result.deposits.push(c);
    }
}

function processDeposit(dep, result, html) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    getParam(dep.acc[0].available, result, 'deposits.balance', null, null, parseBalance);
    getParam(dep.acc[0].currency, result, ['deposits.currency' , 'deposits.balance']);
    getParam(dep.date_create, result, 'deposits.date_start', null, null, parseDate);
    getParam(dep.end, result, 'deposits.till', null, null, parseDate);
    getParam(dep.rate, result, 'deposits.pct', null, null, parseBalance);
    getParam(dep.title, result, 'deposits.name');

    var detailsTable = AB.getElement(html, /<table[^>]+prod-balance_var2[^>]*>/, replaceHtmlEntities);
    getParam(detailsTable, result, 'deposits.prolong', /Автоматическое возобновление[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBool);
    getParam(detailsTable, result, 'deposits.prolong_times', /Количество свершившихся автоматических возобновлений[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(json, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

    throw new AnyBalance.Error('Кредиты временно не поддерживаются. Обращайтесь к разработчику.');

    var products = [];
    for(var i=0; i<json.data.length; ++i){
        var p = json.data[i];
        if(p.type == 'loan')
            products.push(p);
    }

    AnyBalance.trace('Найдено кредитов: ' + products.length);
    result.credits = [];

    for(var i=0; i < products.length; ++i){
        var p = products[i];
        var id = p.id;
        var num = p.num;
        var info;
        if(!num){
        	//Нет номера. Надо тогда достать номер счета
        	var url = getActionUrl(/Информация по кредиту/i, p.actions);
        	info = AnyBalance.requestGet(url, g_headers);
        	var props = getElement(info, /<div[^>]+h-content-inner[^>]*>/i, replaceHtmlEntities);
        	num = getParam(props, null, null, /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        }

        var title = p.title + ' ' + num.substr(-4);

        var c = {__id: id, __name: title, num: num};

        if(__shouldProcess('credits', c)) {
            processCredit(p, c, info);
        }

        result.credits.push(c);
    }
}

function processCredit(credit, result, info){
    AnyBalance.trace('Обработка кредита ' + result.__name);

	getParam(credit.loan.amount, result, 'credits.limit', null, replaceTagsAndSpaces, parseBalance);
	getParam(credit.acc[0].available, result, 'credits.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(credit.acc[0].currency, result, 'credits.currency', null, replaceTagsAndSpaces);
	getParam(credit.title, result, 'credits.name');

	getParam(credit.next.amount, result, 'credits.minpay', null, replaceTagsAndSpaces, parseBalance);
	getParam(credit.next.date, result, 'credits.minpay_till', null, replaceTagsAndSpaces, parseDate);

    if(!info){
       	var url = getActionUrl(/Информация по кредиту/i, p.actions);
       	info = AnyBalance.requestGet(url, g_headers);
    } 
    
    var props = getElement(info, /<div[^>]+h-content-inner[^>]*>/i, replaceHtmlEntities);
   	getParam(props, result, 'credits.own', /Остаток на счёте[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
   	getParam(props, result, 'credits.date_start', /Дата заключения договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
   	getParam(props, result, 'credits.accnum', /Номер счета в банке:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

   	if(AnyBalance.isAvailable('credits.schedule')){
   		var url = getActionUrl(/График платежей/i, credit.actions);
   		processCreditSchedule(url, result);
   	}
}
                    
function processBonus(html, result){
    if(!AnyBalance.isAvailable('bonus'))
        return;

	var json = callApi('biz/bonus-list');
	getParam(jspath1(json[0], '$.balance.value.amount'), result, 'bonus');
}

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    var json = callApi('biz/user-settings/personal');
    var info = result.info = {};

    getParam(jspath1(json, '$.fullName.value'), info, 'info.fio');
    getParam(jspath1(json, '$.email.value'), info, 'info.email');
}
