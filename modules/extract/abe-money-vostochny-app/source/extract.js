/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/


var g_domain = 'mobws.faktura.ru';
var g_baseurl = 'https://' + g_domain + '/';
var g_headers = {
	'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 8.0.0; ONEPLUS A3010 Build/OPR6.170623.013)',
	'Connection': 'Keep-Alive'
};
var g_bankId = 11991;

function callApi(verb, params){
	params.appver = '3.10';
	params.locale = 'ru';
	if(!params.reqId)
		params.reqId = Math.ceil(Math.random()*99999);

	var html = AnyBalance.requestPost(g_baseurl + 'mobws/3.0/json/' + verb, params, g_headers); 

	var json = getJson(html);
	if(json.response.result != 0 && json.response.result != 1){
		AnyBalance.trace(html);
		var msg = json.response.message && Base64.decode(json.response.message);
		throw new AnyBalance.Error(msg || 'Ошибка выполнения запроса ' + verb, null, /парол/i.test(msg));
	}
		
	return json.response;
}

function login(){
	if(!AnyBalance.getCookie('JSESSION')) {
		var prefs = AnyBalance.getPreferences();
	    
		var instanceId = AnyBalance.getData('instanceId');
		var pin = AnyBalance.getData('pin');
		var logNew = !(instanceId && pin);
	    
		try{
			if(!logNew){
				var params = joinObjects(createParams(), {
					login: prefs.login,
					instanceId: instanceId,
					pin: pin
				});
		    
				var json = callApi('loginByPin', params);
		    
		        __setLoginSuccessful();
				return json;
			}
		}catch(e){
			AnyBalance.trace('Ошибка входа по пин: ' + e.message);
			logNew = true;
		}
	    
		if(logNew)
			return loginNew();
	}
}

function createParams(){
	var prefs = AnyBalance.getPreferences();

	var hash = hex_md5(prefs.login);

	var params = {
		deviceType:	'android',
		osId:	hash.substr(0, 16),
		deviceId:	Math.abs(crc32(hash)),
		deviceName:	'AnyBalance',
        wifiMacAddress:	'02:00:00:00:00:00',
		osVersion:	26,
		vendor:	'OnePlus',
		hasHceModule:	true,
		root:	false,
		pushEnabled:	true,
		imei: generateImei(prefs.login,	'86256103******L'),
		model:	'msm8996',
		applicationCode:	'express-bank'
	};

	return params;
}

function loginNew(){
	var prefs = AnyBalance.getPreferences();
	var reqId = Math.ceil(Math.random()*99999);
	var code;

	var params = joinObjects(createParams(), {
		publicKey:	'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAN25xe6Nfp0FDB9aL1Ncj18UWnhzS/LqLoTeLXR4VQvATM2P9aX6sc9XgUbAC8t55LLqTxlybtuZROrE4q6/Sp8CAwEAAQ==',
		login: prefs.login,
		applicationStage:	'production',
		reqId:	reqId,
        verificationCode: code,
		password: prefs.password,
		applicationId:	'ru.ftc.faktura.expressbank',
	});

	var json = callApi('login', params);

	if(json.result == 1) {
		AnyBalance.trace('OTP required...');
		var code = AnyBalance.retrieveCode('Пожалуйста, введите смс код для привязки к устройству', null, {inputType: 'number', time: 300000});
		params.verificationCode = code;

		json = callApi('login', params);

	}

	if(!json.object.session.instanceId){
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Ошибка получения идентификатора привязки');
	}

	AnyBalance.setData('instanceId', json.object.session.instanceId);

	var pin = 1000 + Math.floor(Math.random()*8999);

	json = callApi('setPin', {pin: pin});

	AnyBalance.setData('pin', pin);
	AnyBalance.saveData();

	__setLoginSuccessful();
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(result) {
	if(!isAvailable('cards'))
		return;
	
	var json = callApi('getMyFinancesPage', {bankId: g_bankId, type: 'ACCOUNTS'});
	var accounts = (json.object.accounts && json.object.accounts.accounts) || [];

	var cards = [];
	for(var i=0; i<accounts.length; ++i){
		var acc = accounts[i];
		for(var j=0; acc.limits && j < acc.limits.length; ++j){
			var limit = acc.limits[j];
			for(var k = 0; limit.cards && k<limit.cards.length; ++k){
				var card = limit.cards[k];

				card.account = acc;
				card.limit = limit;
				cards.push(card);
			}
		}
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i) {
	    var card = cards[i];
	    
		var _id = card.num.substr(-4) + '_' + card.account.number;
		var title = card.name + ' (' + card.num.substr(-4) + ')';
		
		var c = {__id: _id, num: card.num, __name: title};
		
		if(__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
	getParam(card.num, result, 'cards.num');

	getParam(card.limit.limit, result, 'cards.limit');

//	getParam(html, result, 'cards.debt', /Общая задолженность((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.ovedraft', /Текущий овердрафт((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
	
//	getParam(html, result, 'cards.ovedraft_pcts', /Сумма начисленных процентов по овердрафту((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.ovedraft_overdue', /Просроченный овердрафт((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.overlimit', /Сверхлимитная задолженность((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.commissions', /Cумма комиссий((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.penalty', /Сумма штрафов((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.billing_date', /Расчетная дата((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.minpay', /Минимальный платеж((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards.minpay_overdue', /в том числе просроченные минимальные платежи((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseBalance);

	getParam(card.expireDate, result, 'cards.till');
	getParam(card.cardHolderName, result, 'cards.holder');
	getParam(card.status, result, 'cards.status'); //WORK
	getParam(card.account.availableWhenPay, result, 'cards.balance');	
	getParam(card.account.currencyCode, result, ['cards.currency', 'cards.balance']);
    getParam(card.account.number, result, 'cards.accnum');

	if(typeof processCardTransactions != 'undefined')
		processCardTransactions(card, result);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
	if(!isAvailable('accounts'))
		return;

	var json = callApi('getMyFinancesPage', {bankId: g_bankId, type: 'ACCOUNTS'});

	var accounts = (json.object.accounts && json.object.accounts.accounts) || [];
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i) {
		var acc = accounts[i];

		var id = acc.number;
		var name = acc.name;
		var title = name + ' ' + id.substr(-4);
		
		var c = {
			__id: id,
			__name: title,
			num: id,
			name: name
		};
		
		if(__shouldProcess('accounts', c)){
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(acc, result) {
    getParam(acc.availableWhenPay, result, 'accounts.balance');
    getParam(acc.currencyCode, result, ['accounts.currency', 'accounts']);
//    getParam(acc.availableWhenPay, result, 'accounts.date_start');

    if(typeof processAccountTransactions != 'undefined') {
      processAccountTransactions(acc, result);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Кредиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(result) {
	if(!isAvailable('credits'))
		return;

	throw new AnyBalance.Error('Кредиты пока не поддерживаются. Обращайтесь к разработчикам.');
/*	
	var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
  	html = requestGetWicketActionEx(html, /wicket.event.add\([^"]*?"load"[\s\S]*?"c":"([^"]*)/i);

  var credits = [];
  	try{
		html = requestGetWicketAction(html, /<div[^>]+class="inner\b[^>]+id="(id[^"]+)"(?:[^>]*>){3,7}\s*Кредиты/i);

		credits = getElements(html, /<div[^>]+class=['"]account inner[^>]*>/ig);
	
		AnyBalance.trace('Найдено кредитов: ' + credits.length);
	}catch(e){
		if(/Заявка на кредит/i.test(html)){
			AnyBalance.trace('Кредитов нет: ' + e.message);
		}else{
			AnyBalance.trace('Не удалось найти ссылку на кредиты.' + e.message);
		}
	}
	result.credits = [];
	
	for(var i=0; i < credits.length; ++i) {
		var title = getParam(credits[i], null, null, /<span[^>]*class=['"]index['"](?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		// Ну нет тут возможности определить id 
		var _id = title;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credits[i], c, html);
		}
		
		result.credits.push(c);
	} */
}
/*
function processCredit(credit, result, html) {
	getParam(credit, result, 'credits.limit', /class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(credit, result, ['credits.currency', 'credits.limit', 'credits.balance'], /class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	
	getParam(credit, result, 'credits.minpay_till', /К оплате([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(credit, result, 'credits.minpay', /К оплате[\s\S]*?class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
    html = requestGetWicketAction(credit + html, /<div[^>]+class="account inner[^>]+id="(id[^"]+)"/i);

    getParam(html, result, 'credits.balance', /Общая задолженность(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.principal_debt', /Сумма основного долга(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.pct_sum', /Cумма начисленных процентов(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.debt_expired', /Сумма просроченного основного долга(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.pct_expired', /Сумма просроченных процентов(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.penalty', /Штрафы(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_till', /К оплате([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'credits.minpay', /К оплате[\s\S]*?<div[^>]+total-amounts[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_main_debt', /К оплате[\s\S]*?Сумма основного долга([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_pct', /К оплате[\s\S]*?Сумма процентов([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_others', /К оплате[\s\S]*?Другие комиссии([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_penalty', /К оплате[\s\S]*?Пеня за([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_pct_expired', /К оплате[\s\S]*?Сумма просроченных процентов([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_debt_expried', /К оплате[\s\S]*?Сумма просроченного основного долга([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    var _html = requestGetWicketAction(html, /<small[^>]+id="([^"]*)[^>]*>\s*Условия договора/i);
    getParam(_html, result, 'credits.contract', /Договор №\s*<span[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces);
    getParam(_html, result, 'credits.date_start', /Договор №[\s\S]*?от\s*<span[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseDate);
    getParam(_html, result, 'credits.till', /Дата планового закрытия[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(_html, result, 'credits.payment', /Размер ежемесячного платежа[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(_html, result, 'credits.pct', /Процентная ставка[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(_html, result, 'credits.accnum', /Счет для погашения[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(_html, result, 'credits.pct_effective', /Полная стоимость кредита[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	if(typeof processCreditSchedule != 'undefined') {
    	processCreditSchedule(html, result);
    }
}
*/
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(result) {
	if(!isAvailable('deposits'))
		return;
	
	var json = callApi('getMyFinancesPage', {bankId: g_bankId, type: 'DEPOSITS'});

  	var deposits = (json.object.depositList && json.object.depositList.deposits) || [];

	AnyBalance.trace('Найдено депозитов: ' + deposits.length);

	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i) {
		var dep = deposits[i];

		var num = (dep.contractAccounts && dep.contractAccounts[0] && dep.contractAccounts[0].account.number) || dep.number;
		var title = dep.productName + ' ' + num.substr(-4);
		// Ну нет тут возможности определить id 
		var _id = dep.id;
		
		var c = {__id: _id, __name: title, num: num};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(dep, c);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(dep, result) {
	var acc = dep.contractAccounts && dep.contractAccounts[0];
	if(acc) {
		getParam(acc.currentAmount, result, 'deposits.balance');
		getParam(acc.account.currency.code, result, ['deposits.currency', 'deposits.balance']);
	    getParam(acc.nextInterestAmount, result, 'deposits.pct_next_sum', /Поступление %[\s\S]*?<span[^>]+sum[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(acc.interestRate, result, 'deposits.pct');
	    getParam(acc.interestPaid, result, 'deposits.pct_sum');
        getParam(acc.availableWithdrawalAmount, result, 'deposits.available');
        getParam(acc.amount, result, 'deposits.balance_start');
    	getParam(acc.actions.depositIn, result, 'deposits.can_topup');
    	getParam(acc.actions.depositOut, result, 'deposits.can_withdraw');
    	getParam(acc.account.number, result, 'deposits.accnum');
//        getParam(html, result, 'deposits.topup_period', /Пополнение вклада возможно[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); //с 20.06.2016 по 21.05.2018
	
    	getParam(acc.interestAccountNumber, result, 'deposits.accnum_pct');
    	getParam(acc.returnAccountNumber, result, 'deposits.accnum_return');
//    	getParam(, result, 'deposits.type', /Тип договора вклада[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}

    getParam(dep.term.nextInterestPayDate, result, 'deposits.pct_next');
    getParam(dep.term.expiryDate, result, 'deposits.till');
    getParam(dep.openDate, result, 'deposits.date_start');
    getParam(dep.number, result, 'deposits.contract');
    getParam(dep.term.contractPeriod, result, 'deposits.period');


    if(typeof processDepositsTransactions != 'undefined') {
        processDepositsTransactions(deposit, result);
    }
}

function processInfo(json, result){
	if(!AnyBalance.isAvailable('info'))
		return;

	if(!json){
		return;
	}

	if(!result.info)
		result.info = {};

	getParam(json.object.user.name, result.info, 'info.fio');
}