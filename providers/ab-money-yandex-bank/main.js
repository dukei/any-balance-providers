/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

function generateState(){
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

var g_currency = {
	RUB: '₽',
	KZT: '₸',
	BYN: 'Br',
	USD: '$',
	ILS: '₪',
	AMD: '֏',
	GEL: '₾',
	MDL: 'лей',
	AZN: '₼',
	TJS: 'смн.',
	KGS: 'сом',
	CAD: 'C$',
	undefined: ''
};

var g_type = {
	'DIGITAL': 'Цифровая',
	'PLASTIC': 'Пластиковая',
	'PHYSICAL': 'Физическая',
	undefined: ''
};

var g_status = {
	ACTIVE: 'Активна',
	INACTIVE: 'Не активна',
	BLOCKED: 'Заблокирована',
	ARRESTED: 'Арестована'
};

var g_system = {
	MIR: 'МИР',
	MC: 'MasterCard',
	VISA: 'VISA'
};

var baseurl = 'https://bank.yandex.ru/';
var baseurlApi = 'https://bank.yandex.ru/';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	checkEmpty(prefs.login, 'Введите логин для входа в систему Яндекс!');
	checkEmpty(prefs.password, 'Введите пароль для входа в систему Яндекс!');
	
	if(!g_savedData)
		g_savedData = new SavedData('bank_web', prefs.login);

	g_savedData.restoreCookies();
	
	html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
        "operationName": "GetYandexAuthStatus",
        "variables": {},
        "query": "query GetYandexAuthStatus {\n  yandexAuthStatus\n}\n"
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Csrf-Token': 'no-csrf',
        'X-Yabank-Referer': baseurl
	}));
	
	if(!html || AnyBalance.getLastStatusCode() >= 500){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
		
	var json = getJson(html);
    
	AnyBalance.trace('GetYandexAuthStatus: ' + JSON.stringify(json));
	
	if(json.data && json.data.yandexAuthStatus && json.data.yandexAuthStatus !== 'NOAUTH'){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookies();
		var html = '';
		html = loginYandex(prefs.login, prefs.password, html, baseurl, 'bank_web');
		
		html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
            "operationName": "GetYandexAuthStatus",
            "variables": {},
            "query": "query GetYandexAuthStatus {\n  yandexAuthStatus\n}\n"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': baseurl,
		    'X-Csrf-Token': 'no-csrf',
            'X-Yabank-Referer': baseurl
	    }));
		
	    var json = getJson(html);
        
	    AnyBalance.trace('GetYandexAuthStatus: ' + JSON.stringify(json));
		
		if(json.data && json.data.yandexAuthStatus && json.data.yandexAuthStatus !== 'VALID'){
    		AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    	}

		g_savedData.setCookies();
	    g_savedData.save();
	}
	
	html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
        "operationName": "startSession",
        "variables": {},
        "query": "mutation startSession($input: StartSessionInput) {\n  startSession(input: $input) {\n    id\n    isNewSession\n    action\n    actionReason\n    applications {\n      applicationId\n      type\n      required\n      __typename\n    }\n    supportUrl\n    authorizationTrackId\n    pinAttemptsLeft\n    plusSubscriptionStatus\n    __typename\n  }\n}\n"
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Csrf-Token': 'no-csrf',
        'X-Yabank-Referer': baseurl
	}));
		
	var json = getJson(html);
    
	AnyBalance.trace('startSession: ' + JSON.stringify(json));
	
	var authTrackId = json.data.startSession.authorizationTrackId;
    var authId = json.data.startSession.id;
	
	html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
        "operationName": "AuthorizationSendCode",
        "variables": {
            "input": {
                "idempotencyToken": generateState(),
                "trackId": authTrackId
            }
        },
        "query": "mutation AuthorizationSendCode($input: AuthorizationSendCodeInput!) {\n  authorizationSendCode(input: $input) {\n    status\n    codeFormat\n    retryInterval\n    failData {\n      resultCode\n      supportUrl\n      __typename\n    }\n    phone\n    __typename\n  }\n}\n"
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Csrf-Token': 'no-csrf',
        'X-Yabank-Referer': baseurl
	}));
	
	var json = getJson(html);
    
	AnyBalance.trace('AuthorizationSendCode: ' + JSON.stringify(json));
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код из 4 цифр из SMS, отправленного на ваш номер ' + json.data.authorizationSendCode.phone, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
        "operationName": "AuthorizationVerifyCode",
        "variables": {
            "input": {
                "code": code,
                "trackId": authTrackId
            }
        },
        "query": "mutation AuthorizationVerifyCode($input: AuthorizationSendVerifyInput!) {\n  authorizationVerifyCode(input: $input) {\n    verificationResult\n    okData {\n      verificationToken\n      __typename\n    }\n    failData {\n      resultCode\n      attemptsLeft\n      __typename\n    }\n    __typename\n  }\n}\n"
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Csrf-Token': 'no-csrf',
        'X-Yabank-Referer': baseurl
	}));
	
	var json = getJson(html);
    
	AnyBalance.trace('AuthorizationVerifyCode: ' + JSON.stringify(json));
	
	if(json.data && json.data.authorizationVerifyCode && !json.data.authorizationVerifyCode.okData){
		var error = json.data.authorizationVerifyCode.failData && json.data.authorizationVerifyCode.failData.resultCode;
		if(error){
		    if(/CODE_MISMATCH/i.test(error)){
				throw new AnyBalance.Error('Неверный код подтверждения', null, true);
			}else{
				throw new AnyBalance.Error(error, null, true);
			}
		}
	
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}
	
	var verifyToken = json.data.authorizationVerifyCode.okData.verificationToken;
	
	html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({ // Устанавливаем банковскую сессию
        "operationName": "startSession",
        "variables": {
            "input": {
                "verificationToken": verifyToken
            }
        },
        "query": "mutation startSession($input: StartSessionInput) {\n  startSession(input: $input) {\n    id\n    isNewSession\n    action\n    actionReason\n    applications {\n      applicationId\n      type\n      required\n      __typename\n    }\n    supportUrl\n    authorizationTrackId\n    pinAttemptsLeft\n    plusSubscriptionStatus\n    deepLink\n    __typename\n  }\n}"
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Csrf-Token': 'no-csrf',
        'X-Yabank-Referer': baseurl
	}));
	
	var json = getJson(html);
    
	AnyBalance.trace('startSessionId: ' + JSON.stringify(json));
	
	var startSessionId = json.data && json.data.startSession && json.data.startSession.id;
	
    var result = {success: true};
	
	html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({ // Балансы с главной страницы
        "operationName": "HomeProducts",
        "variables": {},
        "query": "query HomeProducts {\n  homeProducts {\n    id\n    title\n    description\n    desktopDescription\n    mobileDescription\n    value {\n      amount\n      currency\n      __typename\n    }\n    externalLink\n    __typename\n  }\n}"
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Csrf-Token': 'no-csrf',
        'X-Yabank-Referer': baseurl
	}));
		
	var json = getJson(html);
    
	AnyBalance.trace('HomeProducts: ' + JSON.stringify(json));
	
	var products = json.data && json.data.homeProducts;
	
	if(products && products.length > 0){
		AnyBalance.trace('Найдено продуктов: ' + products.length);
		for(var i=0; i<products.length; ++i){
	    	var product = products[i];
			var amount = (product.value && product.value.amount) || 0;
			AnyBalance.trace('Найден продукт "' + product.title + '": ' + JSON.stringify(product));
			if(product.title == 'Баллы Плюса'){
				getParam(amount, result, 'balance_plus', null, null, parseBalance);
			}else if(product.title == 'Карта'){
				getParam(amount, result, 'balance', null, null, parseBalance);
				getParam(g_currency[product.value && product.value.currency]||product.value && product.value.currency, result, ['currency', 'balance']);
				getParam(product.value && product.value.currency, result, 'currency_code');
			}else if(product.title == 'Сейвы'){
				getParam(amount, result, 'balance_saves', null, null, parseBalance);
			}else if(product.title == 'Сплит'){
				getParam(amount, result, 'balance_split', null, null, parseBalance);
			}else{
				AnyBalance.trace('Неизвестный продукт: ' + product.title);
			}
	    }
	}else{
		AnyBalance.trace('Не удалось получить данные по продуктам. Пробуем получить баланс альтернативным способом...');
        html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({ // Баланс и Баллы Плюса
            "operationName": "GetWalletBalance",
            "variables": {},
            "query": "query GetWalletBalance($agreementProduct: AgreementProduct) {\n  bankUser {\n    id\n    wallet(product: $agreementProduct) {\n      balance(product: $agreementProduct) {\n        id\n        money {\n          amount\n          currency\n          walletId\n          __typename\n        }\n        plus {\n          id\n          amount\n          currency\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': baseurl,
		    'X-Csrf-Token': 'no-csrf',
            'X-Yabank-Referer': baseurl
	    }));
		
	    var json = getJson(html);
        
	    AnyBalance.trace('GetWalletBalance: ' + JSON.stringify(json));
	    
	    getParam(json.data.bankUser.wallet.balance.money.amount, result, 'balance', null, null, parseBalance);
	    getParam(g_currency[json.data.bankUser.wallet.balance.money.currency]||json.data.bankUser.wallet.balance.money.currency, result, ['currency', 'balance']);
		getParam(json.data.bankUser.wallet.balance.plus.amount, result, 'balance_plus', null, null, parseBalance);
    }
	
    if(AnyBalance.isAvailable('paymentSystem', 'cardStatus')){
	    html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
            "operationName": "getMainPageBankCard",
            "variables": {},
            "query": "query getMainPageBankCard {\n  bankUser {\n    id\n    card {\n      id\n      status\n      paymentSystem\n      __typename\n    }\n    cards {\n      type\n      status\n      __typename\n    }\n    __typename\n  }\n}\n"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': baseurl,
		    'X-Csrf-Token': 'no-csrf',
            'X-Yabank-Referer': baseurl + 'card'
	    }));
		
	    var json = getJson(html);
        
	    AnyBalance.trace('getMainPageBankCard: ' + JSON.stringify(json));
		
        var card = json.data && json.data.bankUser && json.data.bankUser.card;
		
		if(card){
		    var cardId = card.id;
		    getParam(g_system[card.paymentSystem]||card.paymentSystem, result, 'paymentSystem');
		    getParam(g_status[card.status]||card.status, result, 'cardStatus');
		}else{
 	        AnyBalance.trace('Не удалось получить данные по карте');
 	    }
    }
		
	html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
        "operationName": "GetBankCard",
        "variables": {},
        "query": "query GetBankCard {\n  bankUser {\n    id\n    card {\n      id\n      lastPanDigits\n      expirationDate\n      status\n      __typename\n    }\n    cards {\n      id\n      lastPanDigits\n      expirationDate\n      status\n      type\n      __typename\n    }\n    __typename\n  }\n}"
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Csrf-Token': 'no-csrf',
        'X-Yabank-Referer': baseurl + 'card'
	}));
	
	var json = getJson(html);
    
	AnyBalance.trace('GetBankCard: ' + JSON.stringify(json));
	
	var cards = json.data && json.data.bankUser && json.data.bankUser.cards;
	
	if(cards && cards.length > 0){
		AnyBalance.trace('Найдено карт: ' + cards.length);
		for(var i=0; i<cards.length; ++i){
		    card = cards[i];
		    getParam(card.lastPanDigits, result, 'cardNumber', /\d{4}$/, [/(\d{4})/, "**** $1"]);
		    getParam(card.lastPanDigits, result, '__tariff', /\d{4}$/, [/(\d{4})/, "**** $1"]);
//		    getParam(g_system[card.paymentSystem]||card.paymentSystem, result, 'paymentSystem');
		    getParam(g_type[card.type]||card.type, result, 'cardType');
		    getParam(g_status[card.status]||card.status, result, 'cardStatus');
			getParam(card.expirationDate, result, 'cardDate');
		    var cardId = card.id;
			
			break;
		}
	}else{
 	    AnyBalance.trace('Не удалось получить данные по картам');
 	}
		
    html = AnyBalance.requestPost('https://pcidss.bank.yandex.ru/v1/card/v2/get_details', JSON.stringify({ // Полный номер карты
        "card_id": cardId
    }), addHeaders({
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'X-Idempotency-Token': generateState()
	}));
	
	var json = getJson(html);
	
	if(json.success_data && json.success_data.number){
		getParam(json.success_data.number, result, 'cardNumber', /\d*/, [/(\d{4})(\d{2})(\d{2})(\d{4})(\d{4})/, "$1 $2** **** $5"]);
		getParam(json.success_data.number, result, '__tariff', /\d*/, [/(\d{4})(\d{2})(\d{2})(\d{4})(\d{4})/, "$1 $2** **** $5"]);
	}
	
	if(AnyBalance.isAvailable(['cardAttach', 'cardAttach2', 'cardAttach3', 'cardAttach4', 'cardAttach5'])){
	    html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
            "operationName": "UserCardsAndAccounts",
            "variables": {},
            "query": "query UserCardsAndAccounts {\n  userCardsAndAccounts {\n    promos\n    cards {\n      id\n      bankName\n      cardName\n      type\n      paymentSystem\n      lastPanDigits\n      logoSrc\n      logoSrc2x\n      __typename\n    }\n    __typename\n  }\n}"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': baseurl,
		    'X-Csrf-Token': 'no-csrf',
            'X-Yabank-Referer': baseurl
	    }));
		
	    var json = getJson(html);
        
	    AnyBalance.trace('UserCardsAndAccounts: ' + JSON.stringify(json));
	
	    var cards = json.data && json.data.userCardsAndAccounts && json.data.userCardsAndAccounts.cards;
	
	    if(cards && cards.length > 0){
		    var ac = [];
			for(var i = 0; i<cards.length; i++){
				if(!cards[i].bankName || cards[i].cardName == 'Карта Пэй'){ // Это Карта Пэй, пропускаем
					continue;
				}else{
					ac.push(cards[i]);
				}
			}
		}
		
		if(ac && ac.length > 0){
		    AnyBalance.trace('Найдено привязанных карт: ' + ac.length);
		    for(var i = 0; i<ac.length; i++){
			    var acard = (i >= 1 ? 'cardAttach' + (i + 1) : 'cardAttach');
				var res = ac[i].lastPanDigits;
				if(ac[i].bankName || ac[i].paymentSystem)
					res += ' (' + (ac[i].bankName ? (ac[i].bankName + ', ') : '') + (ac[i].paymentSystem ? g_system[ac[i].paymentSystem]||ac[i].paymentSystem : '') + ')';
				getParam(res, result, acard);
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить данные по привязанным картам');
        }
	}

	if(AnyBalance.isAvailable(['lastOperDate', 'lastOperSum', 'lastOperDesc', 'lastOperStatus', 'lastOperPlus'])){
	    html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
            "operationName": "OperationsFeed",
            "variables": {
                "pageSize": 30,
                "skipPendingOperations": false
            },
            "query": "query OperationsFeed($pageSize: Int!, $cursor: String, $product: AgreementProduct, $agreementId: String, $skipPendingOperations: Boolean!) {\n  bankUser {\n    id\n    operations(\n      pageSize: $pageSize\n      cursor: $cursor\n      product: $product\n      agreementId: $agreementId\n    ) {\n      cursor\n      items {\n        ...operationFieldsForList\n        __typename\n      }\n      __typename\n    }\n    pendingOperations(product: $product, agreementId: $agreementId) @skip(if: $skipPendingOperations) {\n      title\n      cursor\n      items {\n        ...operationFieldsForList\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment operationFieldsForList on Operation {\n  id\n  status {\n    code\n    message\n    __typename\n  }\n  type\n  date\n  datetime\n  name\n  description\n  direction\n  money {\n    amount\n    currency\n    __typename\n  }\n  plus {\n    amount\n    currency\n    __typename\n  }\n  image\n  comment {\n    text\n    themes {\n      dark {\n        backgroundColor\n        textColor\n        __typename\n      }\n      light {\n        backgroundColor\n        textColor\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  splitOperation {\n    ...splitOperationFields\n    __typename\n  }\n  __typename\n}\n\nfragment splitOperationFields on SplitOperation {\n  id\n  status\n  type\n  lastPaymentDate\n  durationInMonths\n  numberOfPayments\n  paymentNumber\n  trustPaymentMethod {\n    id\n    system\n    number\n    type\n    __typename\n  }\n  consumer {\n    id\n    title\n    subtitle\n    logo\n    __typename\n  }\n  __typename\n}"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': baseurl,
		    'X-Csrf-Token': 'no-csrf',
            'X-Yabank-Referer': baseurl
	    }));
		
	    var json = getJson(html);
        
	    AnyBalance.trace('OperationsFeed: ' + JSON.stringify(json));
	
	    var operations = json.data && json.data.bankUser && json.data.bankUser.operations && json.data.bankUser.operations.items;
	
	    if(operations && operations.length > 0){
		    AnyBalance.trace('Найдено операций: ' + operations.length);
			var g_direction = {DEBIT: '-', CREDIT: '+'};
			
		    for(var i=0; i<operations.length; ++i){
	    	    var operation = operations[i];
				var direction = '' + (g_direction[operation.direction]||operation.direction);
				
				getParam(operation.date, result, 'lastOperDate', null, null, parseDateISO);
				getParam(direction + (operation.money && operation.money.amount), result, 'lastOperSum', null, null, parseBalance);
				getParam(operation.name + ' (' + operation.description + ')', result, 'lastOperDesc');
				getParam(operation.status && operation.status.message, result, 'lastOperStatus');
                getParam(operation.plus && operation.plus.amount, result, 'lastOperPlus', null, null, parseBalance);
				
				break;
	        }
	    }else{
		    AnyBalance.trace('Не удалось получить данные по операциям');
        }
	}

    if(AnyBalance.isAvailable('notifications')){
	    html = AnyBalance.requestPost(baseurlApi + 'graphql', JSON.stringify({
            "operationName": "NotificationsGetEventsData",
            "variables": {
                "input": {
                    "eventType": "MAIN_SCREEN"
                }
            },
            "query": "query NotificationsGetEventsData($input: NotificationsGetEventsInput!) {\n  notificationsGetEvents(input: $input) {\n    events {\n      themes {\n        light {\n          ...BaseNotificationEventTheme\n          __typename\n        }\n        dark {\n          ...BaseNotificationEventTheme\n          __typename\n        }\n        __typename\n      }\n      eventId\n      eventType\n      title\n      description\n      isClosable\n      button {\n        text\n        __typename\n      }\n      actionObject {\n        name\n        payload\n        __typename\n      }\n      __typename\n    }\n    cursor\n    __typename\n  }\n}\n\nfragment BaseNotificationEventTheme on NotificationTheme {\n  background {\n    color\n    __typename\n  }\n  buttonTheme {\n    background {\n      color\n      __typename\n    }\n    textColor\n    __typename\n  }\n  titleTextColor\n  descriptionTextColor\n  images {\n    type\n    url\n    __typename\n  }\n  __typename\n}"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': baseurl,
		    'X-Csrf-Token': 'no-csrf',
            'X-Yabank-Referer': baseurl
	    }));
		
	    var json = getJson(html);
        
	    AnyBalance.trace('NotificationsGetEventsData: ' + JSON.stringify(json));
	
	    var notifications = json.data && json.data.notificationsGetEvents && json.data.notificationsGetEvents.events;
		
		if(notifications && notifications.length > 0){
		    AnyBalance.trace('Найдено уведомлений: ' + notifications.length);
			result.notifications = notifications.length;
	    }else{
		    AnyBalance.trace('Не удалось получить данные по уведомлениям');
			result.notifications = 0;
        }
	}
	
	if(AnyBalance.isAvailable(['email', 'accname', 'fio'])){
	    html = AnyBalance.requestGet('https://api.passport.yandex.ru/all_accounts', addHeaders({'Referer': 'https://passport.yandex.ru/'}));
	    	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    
	    var info = json.accounts[0]; // Получаем информацию только по первому аккаунту
	    
	    if(info){
	    	getParam(info.defaultEmail, result, 'email', null, replaceTagsAndSpaces);
	    	getParam(info.displayName.name, result, 'accname', null, replaceTagsAndSpaces);
	    	var fio = info.displayName.firstname; // Если пользователь не указал в профиле фамилию, значение свойства "fio" имеет вид "Имя null", поэтому делаем в виде сводки
	        if(info.displayName.lastname)
	        	fio += ' ' + info.displayName.lastname;
	        getParam(fio, result, 'fio', null, replaceTagsAndSpaces);
	    }else{
	    	AnyBalance.trace('Не удалось получить информацию об аккаунте');
	    }
	}

    AnyBalance.setResult(result);
}
