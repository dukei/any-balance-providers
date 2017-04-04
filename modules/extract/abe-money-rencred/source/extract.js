/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_rootrul = "https://ib.rencredit.ru";
var g_baseurl = g_rootrul + "/rencredit.server.portal.app/rest/";

var g_headers = {
	Accept: 'application/json, text/*',
    'Accept-Language': 'ru, en',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'Referer': g_rootrul + '/',
    Origin: g_rootrul,
    'X-Requested-With': 'XMLHttpRequest'
}

function checkAPIResultSimple(html){
	if(!html)
		return html;
	var json = getJson(html);
	if(json.errorResponseMo){
        var error = json.errorResponseMo.errorMsg;
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	return json;
}

function callAPI(verb, getParams, postParams){
	return callAPIEx(verb, getParams, postParams, null, checkAPIResultSimple);
}

function callAPIEx(verb, getParams, postParams, addheaders, checkResult){
	var url = g_baseurl + verb, method = 'GET';
	
	if(getParams)
		url += '?' + createUrlEncodedParams(getParams);

	var paramsAreNotJson = postParams && postParams.__paramsAreNotJson;
	if(postParams)
		method = 'POST';
	else
		postParams = '';

	var headers = {
		'X-XSRF-TOKEN': callAPI.data && callAPI.data.csrfToken
	};

	if(postParams && !paramsAreNotJson)
		headers['Content-Type'] = 'application/json; charset=utf-8';
	if(addheaders)
		headers = addHeaders(addheaders, headers);

	var html, tries = 0, maxTries = 5;
	do{
		if(tries > 0){
			AnyBalance.trace('Retrying request: ' + tries + '/' + maxTries);
			AnyBalance.sleep(1000);
		}
		html = AnyBalance.requestPost(url, 
			typeof(postParams) == 'string' || paramsAreNotJson ? postParams : JSON.stringify(postParams), 
			addHeaders(headers), 
			{HTTP_METHOD: method}
		);
//	}while((/Server Hangup/i.test(AnyBalance.getLastStatusString()) || (502 == AnyBalance.getLastStatusCode() && /Server Hangup/i.test(html))) && (++tries <= maxTries));
	}while(500 <= AnyBalance.getLastStatusCode() && 503 >= AnyBalance.getLastStatusCode() && (++tries <= maxTries));

	var json = (checkResult || getJson)(html);
	return json;
}

function login(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var json = callAPI('public/version');
    callAPI.data = {};
    callAPI.data.csrfToken = AnyBalance.getCookie('XSRF-TOKEN');

    json = callAPI('private/client/info');

    if(AnyBalance.getLastStatusCode() == 401){
    	AnyBalance.trace('Необходим новый логин');

    	json = callAPI('public/auth/login', null, {
    		username: prefs.login,
    		password: prefs.password,
    		__paramsAreNotJson: true
    	});

    	if(json.changePasswordRequired)
    		throw new AnyBalance.Error('Банк требует сменить пароль. Пожалуйста, войдите в интернет банк ' + g_rootrul + ' через браузер, смените пароль и введите новый пароль в настройки провайдера', null, true);
    	
    	var code = AnyBalance.retrieveCode('На телефон ' + json.clientInfo.maskedPhoneNumber + ' выслан код подтверждения для входа в интернет банк. Пожалуйста, введите его', null, {inputType: 'number', time: json.validityOfOtpInSeconds*1000});

    	json = callAPI('private/auth/confirm', null, {
    		confirmationCode: code,
   			__paramsAreNotJson: true
    	});
    }

	if(!json.clientInfo){
        var error = json.errorResponseMo && json.errorResponseMo.errorMsg;
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
    }

    var clientInfo = json.clientInfo;

    __setLoginSuccessful();

    return clientInfo;
}

function fetchProductsJson(name){
	var info = {
		card: {
			verb: 'private/products/cards',
			name: 'карты',
			firstTimeParams: {
				forceRequest: 'true'
			}
		},
		loan: {
			verb: 'private/products/loans',
			name: 'кредиты'
		},
		account: {
			verb: 'private/products/accounts',
			name: 'счета'
		},
		deposit: {
			verb: 'private/products/deposits',
			name: 'депозиты'
		}
	}
	
	if(!info[name])
		throw new AnyBalance.Error('Неправильный продукт!', null, true);

	if(!fetchProductsJson.data)
		fetchProductsJson.data = {};

	if(fetchProductsJson.data[name])
		return fetchProductsJson.data[name];

    var tries = 0, maxTries = 10, json;

    do{
    	if(tries > 0){
    		AnyBalance.trace('Пытаемся получить ' + info[name].name + ', попытка ' + (tries + 1) + '/' + maxTries);
    		AnyBalance.sleep(2000);
    	}
    	json = callAPI(info[name].verb, tries == 0 ? info[name].firstTimeParams : null);
    }while(!json.items && ++tries<maxTries);

    return fetchProductsJson.data[name] = json;
}

function processCards(result) {
    if (!AnyBalance.isAvailable('cards'))
        return;

    var json = fetchProductsJson('card');
    result.cards = [];
    for (var i = 0; i < json.items.length; ++i) {
        var card = json.items[i];
        if (card.cardType.code == 'LOY')
            continue;

        var c = {
            __id: card.id,
            __name: card.cardType.localizedText + ', ' + card.cardNumber,
            num: card.cardNumber
        }

        if (__shouldProcess('cards', c)) {
            processCard(card, c);
        }

        result.cards.push(c);
    }
}

function processBonus(result) {
    if (!AnyBalance.isAvailable('bonus'))
        return;

    var json = fetchProductsJson('card');
    for (var i = 0; i < json.items.length; ++i) {
        var card = json.items[i];
        if (card.cardType.code == 'LOY'){
            getParam(card.availableAmount.amount, result, 'bonus');
        }
    }
}

function processCard(card, result){
    //Доступный лимит
	getParam(card.availableAmount.amount, result, 'cards.balance');
	//Валюта
	getParam(card.availableAmount.currency.code, result, ['cards.currency', 'cards.balance', 'cards.minpay', 'cards.limit', 'cards.own', 'cards.blocked', 'cards.cash']);
    //Тип
    getParam(card.cardType.localizedText, result, 'cards.type');
    getParam(card.cardType.code, result, 'cards.type_code'); //DBTO
    //Статус
    getParam(card.status.localizedText, result, 'cards.status');
    getParam(card.status.code, result, 'cards.status_code'); //ACTIVE|CLOSED
//    getParam(card.closed, result, 'cards.closed');

    getParam(card.lastPayPeriodMinimumPayment, result, 'cards.minpay');
    getParam(card.creditLimit, result, 'cards.limit');
    getParam(card.ownFundsAmount, result, 'cards.own');
//    getParam(html, result, 'cards.cash', /<div[^>]+class="cell[^>]*>Доступные средства для снятия наличных[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card.blockedAmount, result, 'cards.blocked');
    getParam(card.payPeriodDateOfCompletion, result, 'cards.minpaytill', null, null, parseDateISO);
//    getParam(html, result, 'cards.userName', /<span[^>]+class="[^>]*fio[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(card.accountNumber, result, 'cards.accnum');
    getParam(card.contractNumber, result, 'cards.contract');
    getParam(card.productType, result, 'cards.type_product');

    if(AnyBalance.isAvailable('cards.transactions')){
    	processCardsTransactions(card, result);
    }

    
}

function processCredits(html, result) {
    if (!AnyBalance.isAvailable('credits'))
        return;

    throw new AnyBalance.Error('Кредиты пока не поддерживаются. Обращайтесь к разработчикам');

    var json = fetchLoansJson();
    result.credits = [];
    for (var i = 0; i < json.loans.length; ++i) {
        var credit = json.loans[i];
        var c = {
            __id: credit.id,
            __name: credit.name + ', ' + credit.contractNumber,
            num: credit.contractNumber
        }

        if (__shouldProcess('credits', c)) {
            processCredit(credit, c);
        }

        result.credits.push(c);
    }
}

function processCredit(credit, result){
    //Доступный лимит
	getParam(credit.creditAmount, result, 'credits.balance', null, null, parseBalance);
	//Валюта
	getParam(credit.currency, result, ['credits.currency', 'credits.balance', 'credits.minpay', 'credits.limit']);
    //Тип
    getParam(credit.name, result, 'credits.name');

   	getParam(credit.nextInstallmentAmount, result, 'credits.minpay', null, null, parseBalance);
   	getParam(credit.nextInstallmentDate, result, 'credits.minpay_till', null, null, parseDate);
   	getParam(credit.openingDate, result, 'credits.date_start', null, null, parseDate);
    //Статус
    getParam(credit.status, result, 'credits.status'); //Открыт
    getParam(credit.closed_or_not_paid, result, 'credits.close_reason'); //closed|not_paid?

    if(g_url.detailsLoan && AnyBalance.isAvailable('credits.accnum', 'credits.date_end', 'credits.period', 'credits.pct', 'credits.limit')){
    	var html = AnyBalance.requestGet(g_url.detailsLoan.replace('{{id}}', credit.id), g_headers);

    	getParam(html, result, 'credits.accnum', /<div[^>]+class="cell[^>]*>Номер текущего счета[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    	getParam(html, result, 'credits.date_end', /<div[^>]+class="cell[^>]*>Дата закрытия кредитного договора[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    	getParam(html, result, 'credits.limit', /<div[^>]+class="cell[^>]*>Сумма кредита[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'credits.period', /<div[^>]+class="cell[^>]*>Срок кредита[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credits.pct', /<div[^>]+class="cell[^>]*>Годовая процентная ставка по кредиту[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('credits.transactions')){
    	processCreditsTransactions(credit, result);
    }

    if(AnyBalance.isAvailable('credits.schedule')){
    	processCreditsSchedule(credit, result);
    }
}


function processInfo(clientInfo, result){
    var info = result.info = {};
    getParam(clientInfo.surname + ' ' + clientInfo.name + ' ' + clientInfo.patronymic, info, 'info.fio');
    getParam(clientInfo.surname, info, 'info.name_last');
    getParam(clientInfo.patronymic, info, 'info.name_patronymic');
    getParam(clientInfo.name, info, 'info.name');
    getParam(clientInfo.maskedHomeNumber, info, 'info.hphone'); //+7000*****00
    getParam(clientInfo.maskedPhoneNumber, info, 'info.mphone'); //+7905*****42
    getParam(clientInfo.maskedOfficePhone, info, 'info.wphone'); //+7861*****25
    getParam(clientInfo.email, info, 'info.email'); //K*********@MAIL.RU
}

