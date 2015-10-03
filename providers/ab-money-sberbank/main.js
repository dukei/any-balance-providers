/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'spasibo': 'spasibo',
		'userName': 'userName',
		'eurPurch': 'eurPurch',
		'eurSell': 'eurSell',
		'usdPurch': 'usdPurch',
		'usdSell': 'usdSell',
	}, 
	card: {
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"cardNumber": "cards.cardNumber",
		"till": "cards.till",
		"status": "cards.status",
		"cardName": "cards.cardName",
		"minpaydate": "cards.minpaydate",
		"minpay": "cards.minpay",
		"maxlimit": "cards.maxlimit",
		"debt": "cards.debt",
		"debt_date": "cards.debt_date",
		"cash": "cards.cash",
		"own": "cards.own",
		"electrocash": "cards.electrocash",
		"userName": "cards.userName",
		"__tariff": "cards.cardNumber",
		
		"lastPurchSum": "cards.transactions10.sum",
		"lastPurchPlace": "cards.transactions10.name",
		"lastPurchDate": "cards.transactions10.time"
		
	},
	loan: {
    	"balance": "loans.balance",
		"currency": "loans.currency",
		"till": "loans.till",
		
		"minpaydate": "loans.minpaydate",
		"minpay": "loans.minpay",
		"maxlimit": "loans.maxlimit",
		"loan_ammount": "loans.loan_ammount",
		"userName": "loans.userName",
		"cardNumber": "loans.num",
		"__tariff": "loans.num",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"rate": "accounts.rate",
		"cardNumber": "accounts.num",
		"__tariff": "accounts.num",
		"till": "accounts.till",
    },
	metal_acc: {
    	"balance": "accounts_met.balance",
    	"currency": "accounts_met.currency",
		"cardNumber": "accounts_met.num",
		"__tariff": "accounts_met.__name",
		"weight": "accounts_met.weight",
		"weight_units": "accounts_met.weight_units",

		"lastPurchSum": "accounts_met.transactions.sum",
		"lastPurchPlace": "accounts_met.transactions.descr",
		"lastPurchDate": "accounts_met.transactions.time"

    }
};

function main(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|metal_acc|loan)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
	if(prefs.source == 'app') {
		if(prefs.type == 'loan')
			throw new AnyBalance.Error('Отображение кредитов не поддерживается в API мобильного приложения. Попробуйте получить данные через сайт.');
		
		mainMobileApp2(prefs);
		return;
	}
	
    adapter.processRates = adapter.envelope(processRates);
    adapter.processCards = adapter.envelope(processCards);
    adapter.processAccounts = adapter.envelope(processAccounts);
    adapter.processMetalAccounts = adapter.envelope(processMetalAccounts);
    adapter.processLoans = adapter.envelope(processLoans);
    adapter.fetchNewThanks = adapter.envelope(fetchNewThanks);
	
	var html = login(prefs);
	
	var result = {success: true};
	
	adapter.processRates(html, result);
	adapter.fetchNewThanks(nodeUrl, result);
	
	if(prefs.type == 'card') {
		adapter.processCards(html, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найдена карта с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одной карты!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts(html, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'loan') {
		adapter.processLoans(html, result);

		if(!adapter.wasProcessed('loans'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден кредит с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'metal_acc') {
		adapter.processMetalAccounts(html, result);
		
		if(!adapter.wasProcessed('accounts_met'))
			throw new AnyBalance.Error(prefs.lastdigits ? 'Не найден металлический счет с последними цифрами ' + prefs.lastdigits : 'У вас нет ни одного металлического счета!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	var num = getParam(info.__name, null, null, /([^,]+)/i);
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(num, prefs.lastdigits))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type != 'acc')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num, prefs.lastdigits))
				return true;
		}
		case 'loans':
		{
			if(prefs.type != 'loan')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num, prefs.lastdigits))
				return true;
		}	
		case 'accounts_met':
		{
			if(prefs.type != 'metal_acc')
				return false;
		    if(!prefs.lastdigits)
		    	return true;
			
			if(endsWith(info.num, prefs.lastdigits))
				return true;
		}
		default:
			return false;
	}
}

function requestApi(action, params, dontAddDefParams, url, ignoreErrors) {
	var baseurl = (url || 'https://online.sberbank.ru:4477/CSAMAPI/');
	return requestApi2(baseurl + action, params, !dontAddDefParams, ignoreErrors);
}

function requestApi2(url, params, addDefParams, ignoreErrors) {
	var m_headers = {
		'Connection': 'keep-alive',
		'User-Agent': 'Mobile Device',
		'Origin':'',
	};
	
	if(!addDefParams) {
		var newParams = params;
	} else {
		var newParams = joinObjects(params, {
			'version':'7.00',
			'appType':'android',
			'appVersion':'2014060500',
			'deviceName':'AnyBalanceAPI',
		});
	}
	// регистрируем девайс
	var html = AnyBalance.requestPost(url, newParams, m_headers);
	// Проверим на правильность

	var code = getParam(html, null, null, /<status>\s*<code>(-?\d+)<\/code>/i, null, parseBalance);
	
	if(!/<status>\s*<code>0<\/code>/i.test(html)) {
		AnyBalance.trace(html);
		if(!ignoreErrors){
			var error = sumParam(html, null, null, /<error>\s*<text>\s*<!(?:\[CDATA\[)?([\s\S]*?)(?:\]\]>)\s*<\/text>\s*<\/error>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
			var ex = new AnyBalance.Error(error || "Ошибка при обработке запроса!", null, /неправильный идентификатор/i.test(error));
			ex.code = code;
			throw ex;
		}
	}
	return html;
}

function getToken(html) {
	var token = getParam(html, null, null, /<token>([^<]+)<\/token>/i);
	if(!token) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось найти токен авторизации, сайт изменен?");
	}
	return token;
}

function mainMobileApp2(prefs) {
	if(AnyBalance.getLevel() < 9) {
		throw new AnyBalance.Error('Для использования API мобильного приложения необходим AnyBalance API v9!');
	}
	
	AnyBalance.trace('Входим через API мобильного приложения...');
	
	var defaultPin = '11223';
	
	/*html = requestApi('checkPassword.do', {
		'operation':'check',
		'password':defaultPin
	}, true, 'https://node1.online.sberbank.ru:4477/mobile7/', true);
	*/
	// Здесь нужно узнать, нужна ли привязка
	var guid = AnyBalance.getData('guid', '');
	if(guid) {
		AnyBalance.trace('Устройство уже привязано!');
		AnyBalance.trace('guid is: ' + guid);
		
		try{
			html = requestApi2('https://online.sberbank.ru:4477/CSAMAPI/login.do', {
				'operation':'button.login',
				'mGUID':guid,
				'isLightScheme':'true',
				'devID':hex_md5(prefs.login)
			}, true);
		}catch(e){
			if(e.code == 7){
			     //Приложение не зарегистрировано. Надо перегенерить гуид
			     AnyBalance.trace(e.message + ": Надо перегенерить guid");
			     guid = null;
			}else{
				throw e;
			}
		}
	}

	if(!guid){
		AnyBalance.trace('Необходимо привязать устройство!');
		
		// Сбер стал блокировать одинаковые девайсы, перепривязывая их по новой.
		// Придется сделать так
		var devID = hex_md5(prefs.login + ' ' + Math.random());
		// регистрируем девайс
		var html = requestApi('registerApp.do', {
			'operation':'register',
			'login':prefs.login,
			'devID':devID
		});
		
		var mGUID = getParam(html, null, null, /<mGUID>([\s\S]*?)<\/mGUID>/i);
		if(!mGUID) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error("Не удалось найти токен регистрации, сайт изменен?");
		}
		
		AnyBalance.setData('guid', mGUID);
		AnyBalance.trace('mGUID is: ' + mGUID);
		//AnyBalance.saveData(); Нельзя здесь сохранять! Только после успешного ввода кода!

		// Все, тут надо дождаться смс кода
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из смс, для привязки данного устройства.', null, {
			time: 120000,
			inputType: 'number',
		});
		
		html = requestApi('registerApp.do', {
			'operation':'confirm',
			'mGUID':mGUID,
			'smsPassword':code,
		});
		AnyBalance.trace('Успешно привязали устройство. Создадим PIN...');
		
		html = requestApi('registerApp.do', {
			'operation':'createPIN',
			'mGUID':mGUID,
			'password':defaultPin,
			'isLightScheme':'true',
			'devID':devID
		});

		AnyBalance.saveData();
		var token = getToken(html);
	}
	
	var baseurlAPI = 'https://node1.online.sberbank.ru:4477/mobile7/';
	var result = {success: true};
	
	html = requestApi2(baseurlAPI + 'postCSALogin.do', {'token':getToken(html)});
	
	getParam(html, result, 'userName', /<surName>([\s\S]*)<\/(?:patrName|firstName)>/i, replaceTagsAndSpaces, capitalFirstLetters);
	
	html = requestApi2(baseurlAPI + 'checkPassword.do', {'operation':'check','password':defaultPin});
	// Спасибо
	if (AnyBalance.isAvailable('spasibo')) {
		html = requestApi2(baseurlAPI + 'private/profile/loyaltyURL.do');
		
		var url = getParam(html, null, null, /<url>([^<]{10,})/i, replaceTagsAndSpaces, html_entity_decode);
		if(url) {
			html = AnyBalance.requestGet(url);
			getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		} else {
			AnyBalance.trace("Не удалось найти ссылку на программу спасибо, сайт изменен?");
		}
	}
	// Курсы валют
	if(isAvailable(['eurPurch', 'eurSell', 'usdPurch', 'usdSell'])) {
		AnyBalance.trace('Fetching rates...');
		html = requestApi2(baseurlAPI + 'private/rates/list.do');
		
		getParam(html, result, 'eurPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>EUR/i, null, parseBalance);
		getParam(html, result, 'eurSell', /EUR<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);
		getParam(html, result, 'usdPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>USD/i, null, parseBalance);
		getParam(html, result, 'usdSell', /USD<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);		
	}
	
	// Получим продукты
	html = requestApi2(baseurlAPI + 'private/products/list.do', {showProductType:'cards,accounts,imaccounts'});
	
	if (prefs.type == 'acc')
		throw new AnyBalance.Error('Получение счетов пока не поддерживается, свяжитесь с разработчиками!');
	else
		fetchApiCard(html, result, prefs);
	
	AnyBalance.setResult(result);
}

function fetchApiCard(html, result, prefs) {
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего", null, true);
	
	var digits = '';
	if(prefs.lastdigits) {
		for(var i = 0; i < prefs.lastdigits.length; i++) {
			var сhar = prefs.lastdigits[i]
			digits += сhar + '\\s*';
		}
	}
	
	//<card>(?:[^>]*>){6,10}\s*<number>[\s\d*]+55 82[\s\S]*?<\/card>
	var card = getParam(html, null, null, new RegExp('<card>(?:[^>]*>){6,10}\\s*<number>[\\s\\d*]+' + digits + '[\\s\\S]*?</card>'));
	
	if(!card) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты!'));
	}
	
	getParam(card, result, 'balance', /<amount>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cardNumber', /<number>([^<]+)/i, replaceTagsAndSpaces);
	getParam(card, result, '__tariff', /<number>([^<]+)/i, replaceTagsAndSpaces);
	getParam(card, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], /code>\s*<name>([^<]+)/i, [replaceTagsAndSpaces, /\./, '']);
	getParam(card, result, 'status', /<state>([^<]+)/i, [replaceTagsAndSpaces, /active/i, 'Активная']);
	//getParam(card, result, 'till', reCardTill, replaceTagsAndSpaces, parseDateWord);
	
	var id = getParam(card, null, null, /<id>([^<]+)/i)
	if (AnyBalance.isAvailable('cash', 'electrocash', 'minpay', 'minpaydate', 'maxlimit')) {
		html = requestApi2('https://node1.online.sberbank.ru:4477/mobile7/private/cards/info.do', {'id':id});
		
		//getParam(html, result, ' ', /<holderName>([^<]+)/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
		getParam(html, result, 'cash', /<availableCashLimit>([\s\S]+?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'electrocash', /<purchaseLimit>([\s\S]+?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
		
		// Еще не знаю как это будет выглядеть
		//getParam(html, result, 'minpay', /Минимальный платеж:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'maxlimit', /Кредитный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'minpaydate', /Дата минимального платежа:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseDateForWord);
	}
	
	if (isAvailable(['lastPurchSum', 'lastPurchPlace', 'lastPurchDate'])) {
		try {
			html = requestApi2('https://node1.online.sberbank.ru:4477/mobile7/private/cards/abstract.do', {'id':id, count:10, paginationSize:10});
			
			getParam(html, result, 'lastPurchDate', /<operation><date>([^<]+)/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'lastPurchSum', /<amount>([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'lastPurchPlace', /<description><\!\[CDATA\[([^\]]+)/i, replaceTagsAndSpaces);
		} catch(e) {
			AnyBalance.trace('Не удалось получить выписку: ' + e.message);
		}
	}
}

function fetchNewAccountMetallAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '/PhizIC/private/ima/list.do');
	var lastdigits = prefs.lastdigits ? prefs.lastdigits.replace(/(\d)/g, '$1\\s*') : '(?:\\d\\s*){3}\\d';
	var baseFind = 'class="productNumber\\b[^"]*">[^<]*' + lastdigits + '\\s*<';
	var reCardId = new RegExp(baseFind + '[\\s\\S]*?account_(\\d+)', 'i');
	
	AnyBalance.trace('Пытаемся найти счет: ' + reCardId);
	
	var cardId = getParam(html, null, null, reCardId);
	if (!cardId) {
		if (prefs.lastdigits) throw new AnyBalance.Error("Не удаётся идентификатор счета с последними цифрами " + prefs.lastdigits);
		else throw new AnyBalance.Error("Не удаётся найти ни одного счета");
	}
	
	html = AnyBalance.requestGet(baseurl + '/PhizIC/private/ima/info.do?id=' + cardId);
	
	getParam(html, result, '__tariff', /ProductTitle([^>]*>){2}/i, replaceTagsAndSpaces);
	getParam(html, result, 'weight', /detailAmount([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['weight_units', 'weight'], /detailAmount([^>]*>){2}/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'balance', /По курсу покупки Банка([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /По курсу покупки Банка([^>]*>){2}/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'cardNumber', /productNumber"([^>]*>){2}/i, [replaceTagsAndSpaces, /\D/g, '']);
	
	AnyBalance.setResult(result);
}
