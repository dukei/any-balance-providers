/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json',
	'User-Agent':'OkHttp Headers.java',
	'Content-Type':'text/xml;charset=UTF-8',
	'Connection': 'Keep-Alive'
};

var baseurl = 'https://mobile.bps-sberbank.by:7001/';

var g_soapRequests = {
	header: 
`<env:Header>
    <n0:Security
        xmlns:n0="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <n0:UsernameToken>
            <n0:Username>%LOGIN%</n0:Username>
            <n0:Password>%PASSWORD%</n0:Password>
        </n0:UsernameToken>
    </n0:Security>
    <n1:DeviceUDID xmlns:n1="http://www.SoftClub.by/mobile">%DEVICEID%</n1:DeviceUDID>
    <n2:ApplicID xmlns:n2="http://www.SoftClub.by/mobile">%VERSION%</n2:ApplicID>
    <n3:lang xmlns:n3="http://www.SoftClub.by/mobile">ru</n3:lang>
    <n4:clientKind xmlns:n4="http://www.SoftClub.by/mobile">0</n4:clientKind>
</env:Header>`,

	accounts: {
		url: 'by.softclub.services.mobile.sc.ifx.retail-1.0/AccountWS',
		body: 
`<env:Envelope xmlns:acc="http://www.softclub.by/neteller/account"
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
    %HEADER%
    <env:Body>
        <acc:getUserAccountsOverview>
            <typeProductRequest>
                <cardAccount />
                <depoAccount />
                <creditAccount />
            </typeProductRequest>
        </acc:getUserAccountsOverview>
    </env:Body>
</env:Envelope>`,
		action: '/by.softclub.services.mobile.sc.ifx.retail-1.0/AccountWS?wsdl'
	},

	login: {
		url: 'ClientIdAndNameByLg-scws-context-root/GetClientIdAndNamePort',
		body: 
`<env:Envelope xmlns:cus="http://www.softclub.by/neteller/customer"
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
    %HEADER%
    <env:Body>
        <cus:User>
            <cus:LOGIN_NAME>%LOGIN%</cus:LOGIN_NAME>
            <cus:CLIENT_TYPE>0</cus:CLIENT_TYPE>
        </cus:User>
    </env:Body>
</env:Envelope>`,
		action: 'GetClientIdAndNameBind/GetClientIdAndNameMethod' 
	},
	cardBalance: {
		url: 'by.softclub.services.mobile.komplat.ex-1.0/KomplatWebServiceEx',
		body: 
`<?xml version="1.0" encoding="utf-8"?>
<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
    %HEADER%
    <env:Body>
        <excuteRequestClobElement xmlns="http://komplat/KomplatWebService/srvs/types/">
            <pRequest><![CDATA[<?xml version="1.0" encoding="Windows-1251" standalone="yes"?>
                <BS_Request>
                <Version>2070</Version>
                <RequestType>Balance</RequestType>
                <ClientId IdType="MS">%CARDHASH%</ClientId>
                <AuthClientId IdType="MS">%CARDHASH%</AuthClientId>
                <TerminalTime>%CURTIME%</TerminalTime>
                <TerminalId>SCMOBILE</TerminalId>
                <TerminalCapabilities>
                <AnyAmount>Y</AnyAmount>
		 <LongParameter>Y</LongParameter>
                <ScreenWidth>99</ScreenWidth>
                <CheckWidth DoubleHeightSymbol="Y" DoubleWidthSymbol="N" InverseSymbol="Y">40</CheckWidth>
                </TerminalCapabilities>
                <Balance Currency="%CURRENCY_NUM%">
                
		<AuthorizationDetails Count="1">
                <Parameter Idx="1" Name="Срок действия карточки"></Parameter>
                </AuthorizationDetails>
                </Balance>
                </BS_Request>
            ]]></pRequest>
            <pSessionId />
            <pSupplieroperid />
            <pErrorCode_inout />
            <pCardNumber />
            <pCardExpDate />
        </excuteRequestClobElement>
    </env:Body>
</env:Envelope>`,
		action: 'http://SoftClub.by/DoIFX180'
	}
}

function makeRequest(type, params, soapRequests){
    soapRequests = soapRequests || g_soapRequests;
	var rinfo = soapRequests[type];
	var body = rinfo.body.replace(/%HEADER%/g, soapRequests.header);
	for(var param in params){
		body = body.replace(new RegExp('%' + param + '%', 'g'), ('' + params[param]).replace('<', '&lt;'));
	}

	var xml = AnyBalance.requestPost(baseurl + rinfo.url, body, addHeaders({SOAPAction: rinfo.action}));
	return xml;
}

var g_baseparams;

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	g_baseparams = {
		LOGIN: prefs.login,
		PASSWORD: prefs.password,
		DEVICEID: hex_md5(prefs.login).substr(0, 16),
		VERSION: 'v2.29'
	};

	var xml = makeRequest('login', g_baseparams);

	var errorcode = getElement(xml, /<(?:faultcode|errorcode)>/i, replaceTagsAndSpaces);
	if(errorcode != '0'){
		var error = getElement(xml, /<(?:faultstring|errortext)>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /парол|не зарегистрирован/i.test(error));
		AnyBalance.trace(xml);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк (ошибка ' + errorcode + '). Сайт изменен?');
	}

    __setLoginSuccessful();
	
	return xml;
}

function getProducts(){
	if(!getProducts.products)
		getProducts.products = makeRequest('accounts', g_baseparams);
	return getProducts.products;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(xml, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    xml = getProducts();

	var accounts = getElement(xml, /<cardAccounts>/i);
	if(!accounts){
		AnyBalance.trace(xml);
		AnyBalance.trace('Не удалось найти карточные счета');
		return;
	}

	accounts = getElements(accounts, /<cardAccount>/ig);
	AnyBalance.trace('Найдено ' + accounts.length + ' счетов');

	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var id = getElement(acc, /<accountId>/i, replaceTagsAndSpaces);
		var num = getElement(acc, /<additionalAccountId>/i, replaceTagsAndSpaces);
		var depoinfo = getElement(acc, /<depoAccountInfo[^>]*>/i);
		var name = getElement(depoinfo, /<name>/i, replaceTagsAndSpaces);

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
    ret = getElement(ret, /<ns2:result>/i, replaceTagsAndSpaces);
    AnyBalance.trace('Got card response: ' + ret);
    hashes[cardHash] = ret;
    requestCardBalance.hashes = hashes;
    return ret;
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account, result, 'accounts.type', /<accountType>([\s\S]*?)<\/accountType>/i, replaceTagsAndSpaces); //1 - карточный счет?
    getParam(account, result, 'accounts.status', /<status>([\s\S]*?)<\/status>/i, replaceTagsAndSpaces); //0 - активный?
    getParam(account, result, ['accounts.currency', 'accounts.balance'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, CurrencyISO.digitsToLetters); 
    getParam(account, result, 'accounts.date_start', /<openDate>([\s\S]*?)<\/openDate>/i, replaceTagsAndSpaces, parseDateISO); 
    getParam(account, result, 'accounts.pct', /<percentRate>([\s\S]*?)<\/percentRate>/i, replaceTagsAndSpaces, parseBalance); 

    if(AnyBalance.isAvailable('accounts.balance')){
        var cardHash = getElement(account, /<cardHash>/i, replaceTagsAndSpaces);
        if(cardHash){
        	var currency = getElement(account, /<currency>/i, replaceTagsAndSpaces);
        	var xml = requestCardBalance(cardHash, currency);
        	getParam(xml, result, 'accounts.balance', /<Amount[^>]*>([\s\S]*?)<\/Amount>/i, replaceTagsAndSpaces, parseBalance);
        }else{
        	AnyBalance.trace('Счет не содержит карт, баланс недоступен');
        }
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(xml, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    xml = getProducts();

	var accounts = getElement(xml, /<cardAccounts>/i);
	if(!accounts){
		AnyBalance.trace(xml);
		AnyBalance.trace('Не удалось найти карточные счета');
		return;
	}

	accounts = getElements(accounts, /<cardAccount>/ig);
	AnyBalance.trace('Найдено ' + accounts.length + ' карточных счетов');

	result.cards = [];
	
	for(var i=0; i <accounts.length; ++i){
        var acc = accounts[i];
		var accid = getElement(acc, /<accountId>/i, replaceTagsAndSpaces);
		var accnum = getElement(acc, /<additionalAccountId>/i, replaceTagsAndSpaces);

		var cards = getElements(acc, /<card\b[^>]*>/ig);
		AnyBalance.trace('Счет ' + accnum + ' содержит ' + cards.length + ' карт');
		for(var j=0; j<cards.length; ++j){
			var card = cards[j];
			var id = getElement(card, /<cardHash>/i, replaceTagsAndSpaces);
			var num = getElement(card, /<maskedCard>/i, replaceTagsAndSpaces);
			var name = getElement(card, /<personalizedName>/i, replaceTagsAndSpaces);
			if(!name) name = getParam(card, null, null, /<cardType[^>]*name="([^"]*)/i, replaceHtmlEntities); 
			var title = name + ' ' + num.substr(-4);

			var c = {__id: id, __name: title, num: num, accid: accid, accnum: accnum, name: name};
		    
			if (__shouldProcess('cards', c)) {
				processCard(card, c, acc);
			}

			result.cards.push(c);
		}

	}
}

function processCard(card, result, acc) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card, result, 'cards.type', /<cardType[^>]*name="([^"]*)/i, replaceHtmlEntities); 
    getParam(card, result, 'cards.type_code', /<cardType[^>]*>([\s\S]*?)<\/cardType>/i, replaceTagsAndSpaces); 
    getParam(card, result, 'cards.status', /<status>([\s\S]*?)<\/status>/i, replaceTagsAndSpaces); //0 - активный?
    getParam(card, result, 'cards.till', /<exprireDate>([\s\S]*?)<\/exprireDate>/i, replaceTagsAndSpaces, parseDateISO); 
    getParam(acc, result, ['cards.currency', 'cards.balance'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, CurrencyISO.digitsToLetters); 

    if(AnyBalance.isAvailable('cards.balance')){
      	var currency = getElement(acc, /<currency>/i, replaceTagsAndSpaces);
      	var xml = requestCardBalance(result.__id, currency);
       	getParam(xml, result, 'cards.balance', /<Amount[^>]*>([\s\S]*?)<\/Amount>/i, replaceTagsAndSpaces, parseBalance);
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

    xml = getProducts();

	var credits = getElement(xml, /<credits>/i);
	if(!credits){
		AnyBalance.trace(xml);
		AnyBalance.trace('Не удалось найти кредиты');
		return;
	}

	credits = getElements(credits, /<credit>/ig);
	AnyBalance.trace('Найдено ' + credits.length + ' кредитов');

	result.credits = [];
	
	for(var i=0; i < credits.length; ++i){
		var credit = credits[i];

		var id = getElement(credit, /<contract_id>/i, replaceTagsAndSpaces);
		var num = getElement(credit, /<contractNumber>/i, replaceTagsAndSpaces);
		var name = getElement(credit, /<contract_name>/i, replaceTagsAndSpaces);
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

    getParam(credit, result, 'credits.status', /<status>([\s\S]*?)<\/status>/i, replaceTagsAndSpaces); //0 - активный?
    getParam(credit, result, 'credits.date_start', /<contract_date>([\s\S]*?)<\/contract_date>/i, replaceTagsAndSpaces, parseDateISO); 
    getParam(credit, result, 'credits.till', /<contract_close_date>([\s\S]*?)<\/contract_close_date>/i, replaceTagsAndSpaces, parseDateISO); 
    getParam(credit, result, ['credits.currency', 'credits.balance'], /<currency>([\s\S]*?)<\/currency>/i, replaceTagsAndSpaces, CurrencyISO.digitsToLetters); 
    getParam(credit, result, 'credits.balance', /<residualAmount>([\s\S]*?)<\/residualAmount>/i, replaceTagsAndSpaces, parseBalance); 
    getParam(credit, result, 'credits.accid', /<relatedAccount>([\s\S]*?)<\/relatedAccount>/i, replaceTagsAndSpaces); 
    getParam(credit, result, 'credits.limit', /<overdraftLimit>([\s\S]*?)<\/overdraftLimit>/i, replaceTagsAndSpaces, parseBalance); 
    getParam(credit, result, 'credits.pct', /<percRate>([\s\S]*?)<\/percRate>/i, replaceTagsAndSpaces, parseBalance); 

    if(AnyBalance.isAvailable('credits.transactions')) {
        processCreditTransactions(credit, result);
    }
}

function processInfo(xml, result){
    var info = result.info = {};

    getParam(xml, info, 'info.fio', /<LAST_NAME>([\s\S]*?)<\/LAST_NAME>/i, replaceTagsAndSpaces);
    getParam(xml, info, 'info.passport', /<PASSPORT_NUMBER>([\s\S]*?)<\/PASSPORT_NUMBER>/i, replaceTagsAndSpaces);
    getParam(xml, info, 'info.paidup', /<PAID_UP>([\s\S]*?)<\/PAID_UP>/i, replaceTagsAndSpaces, parseBalance); //Оплачено до (у них платный интернет-банк?)
}
