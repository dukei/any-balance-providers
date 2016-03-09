/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function requestApiLogin(action, params, ignoreErrors) {
	var baseurl = 'https://online.sberbank.ru:4477/CSAMAPI/';
	return requestApiInner(baseurl + action, params, false, ignoreErrors);
}

function requestApi(action, params, ignoreErrors) {
	var baseurl = 'https://node1.online.sberbank.ru:4477/mobile9/';
	return requestApiInner(baseurl + action, params, true, ignoreErrors);
}

function requestApiInner(url, params, no_default_params, ignoreErrors) {
	var m_headers = {
		'Connection': 'keep-alive',
		'User-Agent': 'Mobile Device'
	}, newParams;
	
	if(no_default_params) {
		newParams = params;
	} else {
		newParams = joinObjects(params, {
			'version':'11.00',
			'appType':'android',
			'appVersion':'7.1.0',
			'deviceName':'AnyBalanceAPI',
		});
	}
	// регистрируем девайс
	var html = AnyBalance.requestPost(url, newParams, m_headers);
	// Проверим на правильность

	var code = getParam(html, null, null, /<status>\s*<code>\s*(-?\d+)\s*<\/code>/i, null, parseBalance);
	
	if(!/<status>\s*<code>\s*0\s*<\/code>/i.test(html)) {
		AnyBalance.trace(html);
		if(!ignoreErrors){
			var error = sumParam(html, null, null, /<error>\s*<text>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/text>\s*<\/error>/ig, replaceTagsAndSpaces, null, aggregate_join);
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

function loginAPI() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Входим через API мобильного приложения...');
	
	var defaultPin = '11223';
	
	// Здесь нужно узнать, нужна ли привязка
	var guid = AnyBalance.getData('guid', '');
	var devid = AnyBalance.getData('devid', '');
	if(!devid){
		// Сбер стал блокировать одинаковые девайсы, перепривязывая их по новой.
		// Придется сделать так
        devid = hex_md5(prefs.login + ' ' + Math.random());
		AnyBalance.setData('devid', devid);
	}
	var pin = prefs.pin || AnyBalance.getData('pin', defaultPin);
	if(!prefs.pin)
		AnyBalance.setData('pin', pin);

	if(guid) {
		AnyBalance.trace('Устройство уже привязано!');
		AnyBalance.trace('guid is: ' + guid);
		
		try{
			html = requestApiLogin('login.do', {
				'operation':'button.login',
				'mGUID':guid,
				'devID': devid,
				'password': pin
			});
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
		
		// регистрируем девайс
		var html = requestApiLogin('registerApp.do', {
			'operation':'register',
			'login':prefs.login,
			'devID':devid
		});
		
		var mGUID = getElement(html, /<mGUID>/i, replaceTagsAndSpaces);
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
		
		html = requestApiLogin('registerApp.do', {
			'operation':'confirm',
			'mGUID':mGUID,
			'smsPassword':code,
		});
		AnyBalance.trace('Успешно привязали устройство. Создадим PIN...');
		
		html = requestApiLogin('registerApp.do', {
			'operation':'createPIN',
			'mGUID':mGUID,
			'password':pin,
			'isLightScheme':'true',
			'devID':devid
		});

		AnyBalance.saveData();
	}
	
	var token = getToken(html);
	if(!token){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}

	html = requestApi('postCSALogin.do', {'token': token});
	return token;
}

var g_products;
function getProductsXMLApi(){
	if(!g_products)
		g_products = requestApi('private/products/list.do', {showProductsType: 'cards,accounts,imaccounts,loans,deposits'});
	return g_products;
}

function processCardsAPI(result) {
    if(!AnyBalance.isAvailable('cards'))
        return;
    var xml = getProductsXMLApi();

    result.cards = [];

    xml = getElement(xml, /<cards>/i);
    if (!xml) {
        AnyBalance.trace('Карты не обнаружены');
        return;
    }

    var cards = getElements(xml, /<card>/ig);
    AnyBalance.trace('Найдено ' + cards.length + ' карт');
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var id = getElement(card, /<id>/i, replaceTagsAndSpaces);
        var num = getElement(card, /<number>/i, replaceTagsAndSpaces);
        var name = getElement(card, /<name>/i, replaceTagsAndSpaces);

        var c = {
            __id: id,
            __name: name + ' ' + num,
            cardNumber: num
        };

        if (__shouldProcess('cards', c)) {
            processCardAPI(card, c);
            result.cards.push(c);
        }
    }
}

function processCardAPI(xml, result) {
    AnyBalance.trace('Обрабатываем карту ' + result.__name);

    var avail = getElement(xml, /<availableLimit>/i);
    getParam(avail, result, 'cards.balance', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
    getParam(avail, result, ['cards.currency', 'cards.balance'], /<currency>\s*<code>([\s\S]*?)<\/code>/i, replaceTagsAndSpaces);
    getParam(xml, result, 'cards.status', /<state>([\s\S]*?)<\/state>/i, replaceTagsAndSpaces);
    getParam(xml, result, 'cards.type', /<type>([\s\S]*?)<\/type>/i, replaceTagsAndSpaces);

    xml = requestApi('private/cards/info.do', {id: result.__id});
    getParam(xml, result, 'cards.cardName', /<holderName>([\s\S]*?)<\/holderName>/i, replaceTagsAndSpaces);

    avail = getElement(xml, /<availableCashLimit>/i);
    getParam(avail, result, 'cards.cash', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);

    avail = getElement(xml, /<purchaseLimit>/i);
    getParam(avail, result, 'cards.electrocash', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);

    getParam(xml, result, 'cards.accnum', /<accountNumber>([\s\S]*?)<\/accountNumber>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('cards.transactions10')) {
        processCardAPITransactions(result);
    }
}

function processCardAPITransactions(result) {
    try {
        var xml = requestApi('private/cards/abstract.do', {id: result.__id, count: 100, paginationSize: 100});
        var elements = getElements(xml, /<operation>/ig);
        AnyBalance.trace('Найдено ' + elements.length + ' последних транзакций');

        result.transactions = [];

        for (var i = 0; i < elements.length; i++) {
            var elem = elements[i];
            var t = {};
            getParam(elem, t, 'cards.transactions10.time', /<date>([\s\S]*?)<\/date>/i, replaceTagsAndSpaces, parseDate);
            getParam(elem, t, 'cards.transactions10.sum', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
            getParam(elem, t, ['cards.transactions10.currency', 'cards.transactions10.sum'], /<currency>\s*<code>([\s\S]*?)<\/code>/i, replaceTagsAndSpaces);
            getParam(elem, t, 'cards.transactions10.name', /<description>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/description>/i, replaceTagsAndSpaces);

            result.transactions.push(t);
        }
    }catch(e){
        AnyBalance.trace('Не удалось получить транзакции для карты ' + result.__name + ': ' + e.message);
    }
}

function processAccountsAPI(result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var xml = getProductsXMLApi();

    result.accounts = [];

    xml = getElement(xml, /<accounts>/i);
    if (!xml) {
        AnyBalance.trace('Счета не обнаружены');
        return;
    }

    var accounts = getElements(xml, /<account>/ig);
    AnyBalance.trace('Найдено ' + accounts.length + ' счетов');
    for (var i = 0; i < accounts.length; i++) {
        var account = accounts[i];
        var id = getElement(account, /<id>/i, replaceTagsAndSpaces);
        var num = getElement(account, /<number>/i, replaceTagsAndSpaces);
        var name = getElement(account, /<name>/i, replaceTagsAndSpaces);

        var c = {
            __id: id,
            __name: name + ' ' + num,
            num: num
        };

        if (__shouldProcess('accounts', c)) {
            processAccountAPI(account, c);
            result.accounts.push(c);
        }
    }
}

function parseBoolAPI(str) {
    return /true/i.test(str);
}

function processAccountAPI(xml, result) {
    AnyBalance.trace('Обрабатываем счет ' + result.__name);

    var avail = getElement(xml, /<balance>/i);
    getParam(avail, result, 'accounts.balance', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
    getParam(avail, result, ['accounts.currency', 'accounts.balance'], /<currency>\s*<code>([\s\S]*?)<\/code>/i, replaceTagsAndSpaces);
    getParam(xml, result, 'accounts.rate', /<rate>([\s\S]*?)<\/rate>/i, replaceTagsAndSpaces, parseBalance);
    getParam(xml, result, 'accounts.till', /<closeDate>([\s\S]*?)<\/closeDate>/i, replaceTagsAndSpaces, parseDate);
    getParam(xml, result, 'accounts.status', /<state>([\s\S]*?)<\/state>/i, replaceTagsAndSpaces);

    xml = requestApi('private/accounts/info.do', {id: result.__id});
    getParam(xml, result, 'accounts.period', /<period>([\s\S]*?)<\/period>/i, replaceTagsAndSpaces);
    getParam(xml, result, 'accounts.balance_min', /<irreducibleAmt>([\s\S]*?)<\/irreducibleAmt>/i, replaceTagsAndSpaces, parseBalance);
    getParam(xml, result, 'accounts.prolong', /<prolongation>([\s\S]*?)<\/prolongation>/i, replaceTagsAndSpaces, parseBoolAPI);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountAPITransactions(result);
    }
}

function processAccountAPITransactions(result) {
    try {
        var dt = new Date();
        var dtFrom = new Date(dt.getFullYear() - 1, dt.getMonth(), dt.getDate());
        var xml = requestApi('private/accounts/abstract.do', {
            id: result.__id,
            from: fmtDate(dtFrom),
            to: fmtDate(dt),
            paginationSize: 1000,
            paginationOffset: 0
        });

        var elements = getElements(xml, /<operation>/ig);
        AnyBalance.trace('Найдено ' + elements.length + ' последних транзакций');

        result.transactions = [];

        for (var i = 0; i < elements.length; i++) {
            var elem = elements[i];
            var t = {};
            getParam(elem, t, 'accounts.transactions10.time', /<date>([\s\S]*?)<\/date>/i, replaceTagsAndSpaces, parseDate);
            getParam(elem, t, 'accounts.transactions10.sum', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
            getParam(elem, t, ['accounts.transactions10.currency', 'accounts.transactions10.sum'], /<currency>\s*<code>([\s\S]*?)<\/code>/i, replaceTagsAndSpaces);
            getParam(elem, t, 'accounts.transactions10.name', /<description>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/description>/i, replaceTagsAndSpaces);

            result.transactions.push(t);
        }
    }catch(e){
        AnyBalance.trace('Не удалось получить транзакции для счета ' + result.__name + ': ' + e.message);
    }
}

function processInfoAPI(result) {
    if(AnyBalance.isAvailable('info')){
        var info = result.info = {};

        var xml = requestApi('private/profile/info.do');
        var joinSpaces = create_aggregate_join(' ');
        sumParam(xml, info, 'info.fio', /<surName>([\s\S]*?)<\/surName>/i, replaceTagsAndSpaces, null, joinSpaces);
        sumParam(xml, info, 'info.fio', /<firstName>([\s\S]*?)<\/firstName>/i, replaceTagsAndSpaces, null, joinSpaces);
        sumParam(xml, info, 'info.fio', /<patrName>([\s\S]*?)<\/patrName>/i, replaceTagsAndSpaces, null, joinSpaces);

        getParam(xml, info, 'info.phone', /<mobilePhone>([\s\S]*?)<\/mobilePhone>/i, replaceTagsAndSpaces);
        getParam(xml, info, 'info.email', /<email>([\s\S]*?)<\/email>/i, replaceTagsAndSpaces);

        var docs = getElements(xml, /<document>/ig);
        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];
            var documentName = getElement(doc, /<documentName>/i, replaceTagsAndSpaces);
            if(/паспорт/i.test(documentName)){
                sumParam(doc, info, 'info.passport', /<documentSeries>([\s\S]*?)<\/documentSeries>/i, replaceTagsAndSpaces, null, joinSpaces);
                sumParam(doc, info, 'info.passport', /<documentNumber>([\s\S]*?)<\/documentNumber>/i, replaceTagsAndSpaces, null, joinSpaces);
            }else{
                AnyBalance.trace('Неизвестный документ: ' + doc);
            }
        }
    }
}

function processRatesAPI(result) {
    // Курсы валют
    if (isAvailable(['eurPurch', 'eurSell', 'usdPurch', 'usdSell'])) {
        AnyBalance.trace('Fetching rates...');
        var html = requestApi('private/rates/list.do');

        getParam(html, result, 'eurPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>EUR/i, null, parseBalance);
        getParam(html, result, 'eurSell', /EUR<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);
        getParam(html, result, 'usdPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>USD/i, null, parseBalance);
        getParam(html, result, 'usdSell', /USD<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);
    }
}
