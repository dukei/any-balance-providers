var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0'
};

function main() {

    AnyBalance.setDefaultCharset('utf-8');

    var API = {
        'accounts': 'https://ib.psbank.ru/api/accounts/?activeOnly=true',
        'deposits': 'https://ib.psbank.ru/api/deposits/?activeOnly=true',
        'cards': 'https://ib.psbank.ru/api/cards/data?activeOnly=true',
        'login': 'https://ib.psbank.ru/api/authentication/token',
		'home': 'https://ib.psbank.ru/',
		'requestSMS': 'https://ib.psbank.ru/api/authentication/secondStepAuthRequest',
		'verifySMS': 'https://ib.psbank.ru/api/authentication/doSecondStepAuth',
    };
    var result = {success: true};
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.login, 'Не задан логин');
    checkEmpty(prefs.password, 'Не задан пароль');

	//***********************************
	//Получить X-XSRF-Token токен
	//***********************************
	
	var tokenRequest = AnyBalance.requestGet(API.home, '', g_headers);
	var match = /__RequestVerificationToken" type="hidden" value="(.+)"/gm.exec(tokenRequest);
    if (match) {
	 var xsrftoken = match[1];
	 AnyBalance.trace('Поучен X-XSRF-Token: ' + xsrftoken);
	} else {
	  AnyBalance.trace(tokenRequest);
	  throw new AnyBalance.Error('Невозможно получить токен. Изменения на сайте?');
	  return;
	}
	
	//***********************************
	//Получить Authorization Bearer токен
	//***********************************
    var credentials = {username: prefs.login, password: prefs.password, loginType: 'Login', grant_type: 'password'};
	var reply = AnyBalance.requestPost(API.login, credentials, g_headers);
	
    var loginResult = getJson(reply);
	if (!loginResult || loginResult.error == 'invalid_grant') {
		AnyBalance.trace(reply);
		throw new AnyBalance.Error(loginResult.messageTemplate, false,true);
	}

    g_headers.Authorization = 'Bearer ' + loginResult.access_token;
    g_headers['X-XSRF-Token'] = xsrftoken;

	if(loginResult.isSecondStepAuthRequired === 'true'){
		reply = AnyBalance.requestGet(API.requestSMS, g_headers);
		var res = getJson(reply);
		AnyBalance.trace('SMS number: ' + res.smsData.smsNumber);

		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из смс для входа в интернет-банк', null, {inputType: 'number', time: res.smsData.lifetime*1000});
	
	    reply = AnyBalance.requestPost(API.verifySMS, JSON.stringify({"value": code,"authorizerType":res.preferredAuthorizerType}), addHeaders({
	    	'Content-Type': 'application/json;charset=UTF-8'
	    }));
		if(reply){
			AnyBalance.trace(reply);
			throw new AnyBalance.Error('Неверный код');
		}
	}

	//***********************************
	//Получить нужные счетчики
	//***********************************
		
	if(prefs.type == 'card') { //Карты
		reply = AnyBalance.requestGet(API.cards, g_headers);
		var cards = getJson(reply);
		if (cards.cardAccounts.length == 0) 
			throw new AnyBalance.Error('Карты не найдены');
		
		var n = 0;
		if (!prefs.lastdigits=='') {
			for (var i=0;i<cards.cardAccounts.length;i++) {
				var number = cards.cardAccounts[i].cards[0].cardNumber;
				if (prefs.lastdigits == number.slice(-4)) 
					n=i;
			}
		}		
		result.balance = cards.cardAccounts[n].cards[0].account.availableBalance;
		result.cardnum = cards.cardAccounts[n].cards[0].cardNumber;
		result.accnum = cards.cardAccounts[n].name;
		result.type = cards.cardAccounts[n].cards[0].account.programType.name;
		result.currency = cards.cardAccounts[n].cards[0].account.currency.nameIso;
		getParam(cards.cardAccounts[n].cards[0].expireDate, result, 'till', null, null, parseDateISO);
		
	} else if(prefs.type == 'acc') { //Счета
	    reply = AnyBalance.requestGet(API.accounts, g_headers);
		var accounts = getJson(reply);
		if (accounts.length == 0) 
			throw new AnyBalance.Error('Счета не найдены');

		var n = 0;
		if (! prefs.lastdigits=='') {
			for (var i=0;i<accounts.length;i++) {
				var number = accounts[i].number;
				if (prefs.lastdigits == number.slice(-4)) 
					n=i;
			}
		}

		result.balance = accounts[n].availableBalance;
		result.accnum = accounts[n].number;
		result.type = accounts[n].name;
		result.currency = accounts[n].currency.nameIso;
		
	} else if(prefs.type == 'dep') { //Вклады
	    reply = AnyBalance.requestGet(API.deposits, g_headers);
		var deposits = getJson(reply);
		if (deposits.length == 0) 
			throw new AnyBalance.Error('Вклады не найдены');
		result.balance = deposits[0].availableBalance;
		result.accnum = deposits[0].number;
		result.type = deposits[0].name;
		result.currency = deposits[0].currency.nameIso;	
	}

   AnyBalance.setResult(result);
}
