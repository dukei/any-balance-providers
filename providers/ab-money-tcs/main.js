/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя систему Интернет-Банк.

Сайт оператора: http://www.tcsbank.ru/
Личный кабинет: https://www.tcsbank.ru/authentication/?service=http%3A%2F%2Fwww.tcsbank.ru%2Fbank%2F
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.154 Safari/537.36'
}

var g_headersMobile = {
    'User-Agent': 'User-Agent: Dalvik/1.6.0 (Linux; U; Android 4.0.4; Android SDK built for x86 Build/IMM76D)'
}

function requestJson(baseurl, data, action, errorMessage) {
	var params = [];
	for (var name in data) {
		params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
	}
	// Заполняем параметры, которые есть всегда
	params.push(encodeURIComponent('y') + '=' + encodeURIComponent('omg'));
	params.push(encodeURIComponent('appVersion') + '=' + encodeURIComponent('2.0.3'));
	params.push(encodeURIComponent('origin') + '=' + encodeURIComponent('mobile'));
	
	var html = AnyBalance.requestGet(baseurl + action + '?' + params.join('&'), g_headers);
	var json = getJson(html);
	
	if(json.resultCode != 'OK' && json.resultCode != 'DEVICE_LINK_NEEDED' && errorMessage)
		throw new AnyBalance.Error(errorMessage + ': ' + json.errorMessage);
	
	return json;
}

function mainMobileApp(baseurl, prefs) {
	AnyBalance.trace('Входим через API Мобильного приложения...');
	var deviceId = hex_md5(prefs.login);
	var sessionId;
	
	baseurl.api = 'https://api.tcsbank.ru/v1/';
	
	var json = requestJson(baseurl.api, {
		'deviceId':deviceId,
		username:prefs.login,
		password:prefs.password,
	}, 'mobile_session', 'Не удалось войти в интернет-банк, сайт изменен?');
	
	sessionId = json.payload.sessionid;
	
    if (json.resultCode == 'DEVICE_LINK_NEEDED') {
    	AnyBalance.trace('Необходимо привязать устройство...');
    	var code;
    	if (AnyBalance.getLevel() >= 7) {
    		code = AnyBalance.retrieveCode("Пожалуйста, введите код подтверждения из смс.", 'R0lGODlhBAAEAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAAEAAQAAAIElI8pBQA7');
    		AnyBalance.trace('Получили код: ' + code);
    	} else {
    		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
    	}
    	json = requestJson(baseurl.api, {
    		'initialOperationTicket': json.payload.confirmationData.operationTicket,
    		'confirmationData': '{SMSBYID:' + code + '}',
    		'initialOperation': 'mobile_link_device',
    		'sessionid': sessionId,
    	}, 'confirm', 'Не удалось привязать устройство');
    }
	
	json = requestJson(baseurl.api, {
		'sessionid': sessionId
	}, 'accounts', 'Не удалось получить данные по картам и депозитам, сайт изменен?');
	
    if(prefs.type == 'dep') {
        fetchDep(json, baseurl, sessionId);
    } else if(prefs.type == 'saving') {
    	fetchSaving(json, baseurl, sessionId);
    } else {
        fetchCard(json, baseurl, sessionId);
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API v.4+');

    AnyBalance.setDefaultCharset('utf-8');

    var basedomain = "www.tcsbank.ru";
    var baseurl = {};
    baseurl._= "https://" + basedomain;
	
	if(prefs['interface'] == 'site') {
		AnyBalance.trace('Входим через сайт...');
		var html = AnyBalance.requestGet(baseurl._ + '/authentication/', g_headers);
		var api = getParam(html, null, null, /TCS\.Auth\.Cfg\.authServiceURL\s*=\s*"[^"]*?(\/api-?[^"]*?\/)session\/"/, replaceSlashes);
		if(!api)
			throw new AnyBalance.Error('Не удаётся найти адрес API. Сайт изменен?');
		
		AnyBalance.trace('API: ' + api);
		baseurl.api = baseurl._ + api;

		var html, sessionid;
		html = AnyBalance.requestGet(baseurl.api + 'session/?username=' + encodeURIComponent(prefs.login) + '&password=' + encodeURIComponent(prefs.password), g_headers);

		if(/технические работы/i.test(html)) {
			throw new AnyBalance.Error('В настоящий момент на сайте проводятся технические работы. Попробуйте запустить обновление позже.');
		}
		
		json = getJson(html);
		if(json.resultCode == 'AUTHENTICATION_FAILED')
			throw new AnyBalance.Error(json.errorMessage || 'Авторизация прошла неуспешно. Проверьте логин и пароль.', null, /проверьте логин и пароль/i.test(json.errorMessage || ''));
		
		if(json.resultCode && json.resultCode != 'OK')
			throw new AnyBalance.Error("Вход в интернет банк не удался: " + json.resultCode);

		sessionid = json.payload.sessionid || json.payload.sessionId;

		if(!sessionid){
			var error = json.errorMessage;
			if(error)
				throw new AnyBalance.Error(error);
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти идентификатор сессии. Сайт изменен?');
		}
			
		AnyBalance.setCookie(basedomain, 'sessionid', sessionid);
		/*    
		if(!prefs.__debug){ //Вход в отладчике глючит, поэтому входим вручную, а проверяем только извлечение счетчиков
			//Устанавливает JSESSIONID
			AnyBalance.requestGet(baseurl + '/authentication/?service=' + encodeURIComponent(baseurl + '/bank/'), g_headers);

			html = AnyBalance.requestPost('https://auth.tcsbank.ru/cas/login', {
				callback:'jQuery1820823795270640403_1355329522395',
				stamp:'_1355329529005_835711790',
				service: baseurl + '/api/v1/session/',
				_eventId:'submit',
				asyncAuthError: baseurl + '/api/v1/auth_error/',
				username:prefs.login,
				password:prefs.password,
				async:true,
				_: new Date().getTime()
			}, addHeaders({Referer: baseurl + '/authentication/?service=' + baseurl + '/bank/accounts/'}));

			//AnyBalance.trace(html);
			var json = getParam(html, null, null, /^jQuery\w+\(\s*(.*)\)\s*$/i);
			if(json){
				var json = getJson(json);
				if(json.resultCode == 'AUTHENTICATION_FAILED')
					throw new AnyBalance.Error(json.errorMessage || 'Авторизация прошла неуспешно. Проверьте логин и пароль.');
				if(json.resultCode != 'OK')
					throw new AnyBalance.Error("Вход в интернет банк не удался: " + json.resultCode);
				if(!json.payload)
					throw new AnyBalance.Error("Не удалось найти идентификатор сессии!");
				sessionid = json.payload;
				AnyBalance.setCookie(basedomain, 'sessionid', sessionid);
			}else{
				//Не вернулся json. Наверное, в чем-то проблема
				throw new AnyBalance.Error("Не удалось зайти в интернет банк. Сайт изменен?");
			}
		}else{
			//В отладчике просто получаем куки в уже зайденной сессии
			var sessionid = AnyBalance.getCookie('sessionid', {domain: 'www.tcsbank.ru'});
			if(!sessionid)
				throw new AnyBalance.Error("Зайдите в ТКС банк вручную, затем запустите отладчик");
		} */

		//Данные грузятся только после получения этой страницы, хитрецы, блин...
		AnyBalance.requestGet(baseurl._ + '/bank/accounts/', g_headers);

		var headers = addHeaders({
			Accept:'application/json, text/javascript, */*; q=0.01',
			'X-Requested-With':'XMLHttpRequest',
			Referer: baseurl._ + '/bank/accounts/'
		});
		
		var accounts = AnyBalance.requestGet(baseurl.api + 'accounts/?sessionid=' + sessionid, headers);
		
		if(/технические работы/i.test(accounts)) {
			throw new AnyBalance.Error('В настоящий момент на сайте проводятся технические работы. Попробуйте запустить обновление позже.');
		}

		AnyBalance.trace("Accounts: "+accounts);
		accounts = getJson(accounts);

		if(accounts.resultCode != 'OK') {
			if(accounts.resultCode == 'INSUFFICIENT_PRIVILEGES') {
				throw new AnyBalance.Error('Банк требует ввода смс кода. Необходимо отключить подтверждение входа по смс в настройках интернет-банка. Либо вы можете использовать API Мобильного приложения, выбрав его в настройках аккаунта.');
			}
			throw new AnyBalance.Error('Не удалось получить список карт: ' + accounts.resultCode);
		}

		if(prefs.type == 'dep'){
			fetchDep(accounts, baseurl, sessionid);
		} else if(prefs.type == 'saving') {
	    	fetchSaving(accounts, baseurl, sessionId);
		} else {
			fetchCard(accounts, baseurl, sessionid);
		}
	}
	// По умолчанию мобильное API
	else
		mainMobileApp(baseurl, prefs);
}

function fetchCard(accounts, baseurl, sessionid){
    var cards = [];
    for(var i=0; i<accounts.payload.length; ++i){
		var cur = accounts.payload[i].accounts;
		for(var z = 0; z < cur.length; z++) {
			var curr = cur[z];
			
			if(/Current|Credit/i.test(curr.accountType))
				cards = cards.concat(curr);
		}
    }
    if(cards.length == 0)
        throw new AnyBalance.Error("У вас нет ни одной карты!");
	
    accounts = cards;

    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d{4,}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите не менее 4 последних цифр номера карты, или не указывайте ничего, чтобы получить информацию по первой карте.");

    var card = null;
    var cardNumber = 0;

    if(!prefs.num){
        card = accounts[0];
    }else{
        findcard: 
        for(var i=0; i<accounts.length; ++i){
            for(var j=0; j<accounts[i].cardNumbers.length; ++j){
                 if(endsWith(accounts[i].cardNumbers[j].value, prefs.num)){
                     card = accounts[i];
                     cardNumber = j;
                     break findcard;
                 }
            }
        }
    }
    
    if(!card)
        throw new AnyBalance.Error("Не удалось найти карту с последними цифрами " + prefs.num);

    var result = {success: true};
    
    var thiscard = card.cardNumbers[cardNumber];

    if(AnyBalance.isAvailable('balance'))
        result.balance = thiscard.availableBalance.value;
    if(AnyBalance.isAvailable('currency'))
        result.currency = card.moneyAmount.currency.name;
    if(AnyBalance.isAvailable('debt') && isset(card.debtAmount))
        result.debt = card.debtAmount.value;
    if(AnyBalance.isAvailable('minpay') && isset(card.currentMinimalPayment))
        result.minpay = card.currentMinimalPayment.value;
    
    if(AnyBalance.isAvailable('name'))
        result.name = thiscard.name;
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = thiscard.value;
    if(AnyBalance.isAvailable('accnum'))
        result.accnum = card.externalAccountNumber;
    if(AnyBalance.isAvailable('freeaddleft') && card.renewalAmountLeft)
        result.freeaddleft = parseBalance(card.renewalAmountLeft.value+'');
    AnyBalance.trace("Cash limit: "+card.monthlyCashLimit);
    if(AnyBalance.isAvailable('freecashleft') && card.monthlyCashLimit)
        result.freecashleft = parseBalance(card.monthlyCashLimit.value+'');
    if(AnyBalance.isAvailable('till') && isset(thiscard.expiration))
        result.till = thiscard.expiration.milliseconds;
    if(AnyBalance.isAvailable('limit') && isset(card.creditLimit))
        result.limit = card.creditLimit.value;
    if(AnyBalance.isAvailable('minpaytill') && isset(card.duedate))
        result.minpaytill = card.duedate.milliseconds;

    if(AnyBalance.isAvailable('pcts')){
        //Информация по выписке
        try{
			var statements = AnyBalance.requestGet(baseurl.api + 'statements/?sessionid=' + sessionid + '&account=' + card.id, addHeaders({
				Accept:'application/json, text/javascript, */*; q=0.01',
				'X-Requested-With':'XMLHttpRequest',
				Referer: baseurl._ + '/bank/accounts/'
			}));
            statements = getJson(statements).payload[0]; //получаем самую последнюю выписку

            if(AnyBalance.isAvailable('pcts') && isset(statements.interest))
                result.pcts = statements.interest.value;
        }catch(e){
            AnyBalance.trace('Не удалось получить информацию по выписке: ' + e.message);
        }
    }

    result.__tariff = thiscard.name;
    
    AnyBalance.setResult(result);
}

function fetchDep(accounts, baseurl, sessionid){
    var deps = [];
    for(var i=0; i<accounts.payload.length; ++i){
		var cur = accounts.payload[i].accounts;
		for(var z = 0; z < cur.length; z++) {
			var curr = cur[z];
			
			if(/Deposit/i.test(curr.accountType))
				deps = deps.concat(curr);
		}
    }
    if(deps.length == 0)
        throw new AnyBalance.Error("У вас нет ни одного депозита!");
	
    accounts = deps;

    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d{4,}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите не менее 4 последних цифр номера депозита, или не указывайте ничего, чтобы получить информацию по первому депозиту.");
    
    var dep = null;

    if(!prefs.num){
        dep = accounts[0];
    }else{
        for(var i=0; i<accounts.length; ++i){
            if(accounts[i].externalAccountNumber && endsWith(accounts[i].externalAccountNumber, prefs.num)){
                dep = accounts[i];
                break;
            }
        }
    }
    
    if(!dep)
        throw new AnyBalance.Error("Не удалось найти депозит с последними цифрами " + prefs.num);
	
    var result = {success: true};
    
    if(AnyBalance.isAvailable('balance'))
        result.balance = dep.moneyAmount.value;
    if(AnyBalance.isAvailable('currency'))
        result.currency = dep.moneyAmount.currency.name;
//    if(AnyBalance.isAvailable('startAmount'))
//        result.startAmount = dep.startAmount;
    if(AnyBalance.isAvailable('name'))
        result.name = dep.name;
    if(AnyBalance.isAvailable('accnum'))
        result.accnum = dep.externalAccountNumber;
    if(AnyBalance.isAvailable('rate'))
        result.rate = dep.depositRate;
    if(AnyBalance.isAvailable('till'))
        result.till = dep.plannedCloseDate.milliseconds;
    if(AnyBalance.isAvailable('pcts') && isset(dep.interest))
        result.pcts = dep.interest.value;
    result.__tariff = dep.name;
    
    AnyBalance.setResult(result);
}

function fetchSaving(accounts, baseurl, sessionid){
	var prefs = AnyBalance.getPreferences();
	var savingList = accounts.payload.reduce(function(res, acc){
		return res.concat(acc.accounts.filter(function(acc){
			return /Saving/i.test(acc.accountType);
		}));
	}, []);
	var saving, filtered, result;

	if(!savingList.length)
		throw new AnyBalance.Error("У вас нет ни одного накопительного счета!");

	// Берем 1й так как нету externalAccountNumber
	saving = savingList[0];

	result = {success: true};
	getParam(saving.moneyAmount.value, result, 'balance');
	getParam(saving.moneyAmount.currency.name, result, ['currency', 'balance']);
	getParam(saving.nextStatementDate.milliseconds, result, 'nextStatementDate');
	getParam(saving.name, result, 'name');
	getParam(saving.name, result, '__tariff');
    
    AnyBalance.setResult(result);
}