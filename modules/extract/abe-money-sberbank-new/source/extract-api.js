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
			'version':'9.20',
			'appType':'android',
			'appVersion':'11.13.0',
			'deviceName':'SM-G973',
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
			var ex = new AnyBalance.Error(error || "Ошибка при обработке запроса!", null, /неправильный идентификатор|неправильный пароль/i.test(error));
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

function generateHex(mask, digits){
	var i=0;
	return mask.replace(/x/ig, function(){
		return digits[i++];
	});
}

function createSdkData(){
  	var dt = new Date(), prefs = AnyBalance.getPreferences();
  	var hex = hex_md5(prefs.login + 'sdk_data_28');

/*			mobileSdkData: '{"TIMESTAMP":"2021-10-21T17:33:9Z","HardwareID":"354809109338562","SIM_ID":"8970101662005544490","PhoneNumber":"","DeviceModel":"SM-G973","DeviceName":"0000000","DeviceSystemName":"Android","DeviceSystemVersion":"28","Languages":"ru_RU",
"WiFiMacAddress":"00:a0:c6:b3:97:91","WiFiNetworksData":{"BSSID":"02:00:00:00:00:00","SignalStrength":"-50","Channel":"8","SSID":3936293315},"ScreenSize":"1440x3040","MCC":"250","MNC":"02",
"AppKey":"31b24386-dd60-3ed3-a900-5fca8f98fa84","SDK_VERSION":"1.5.1.257","Compromised":0,"MultitaskingSupported":true,"AdvertiserId":"3353eed1-c767-32bf-89c1-aa936375551d","OS_ID":"f7cc5b905e4d388c","Emulator":0,
"GeoLocationInfo":[{"Longitude":"0","Latitude":"0","Altitude":"0","HorizontalAccuracy":"0","AltitudeAccuracy":"0","Heading":"0","Speed":"0","Status":"1","Timestamp":"0"}],
"DeveloperTools":0,"GooglePlayProtect":-1,"HoursSinceZoomInstall":-1,"HoursSinceQSInstall":-1,"HoursSinceAnyDeskInstall":-1,"UnknownSources":-1,"AgentBrand":"Samsung","AgentBootTime":"83285","TimeZone":"0","SupportedAPILevel":"28","OSCodeName":"Android Pie","AgentAppInfo":"СберБанк 11.13.0","ApprepInstalledApps":"114","OSFontsNumber":"234","OSFontsHash":-1313735598,"ScreenColorDepth":"~550dpi","TimeZoneDSTOffset":"0","SimCard":"1","AgentSignalStrengthCellular":"-1","AgentConnectionType":"WIFI","AgentSignalTypeCellular":"-1","LocalIPv4":"192.168.0.250","LocalIPv6":"fe80::02a0:c6ff:feb3:9791","DnsIP":"10.0.2.3","ApplicationMD5":"7961c3913fd720d20171b2915aa49b06","RdpConnection":"0","InstallationSource":"com.android.vending","LocationHash":"4b92a30e9d39579fcdaf1be41448ccc259a3d1a5712c77358aedbe99036dd9ce"}',
*/
	var obj = {
		"TIMESTAMP": dt.getUTCFullYear() + '-' + n2(dt.getUTCMonth()) + '-' + n2(dt.getUTCDate()) + 'T' + dt.getUTCHours() + ':' + dt.getUTCMinutes() + ':' + dt.getUTCSeconds() + 'Z',
		"HardwareID": generateImei(prefs.login, '35480910******L'),
		"SIM_ID": generateSimSN(prefs.login, '8970101********L'),
		"PhoneNumber": "",
		"GeoLocationInfo": [
			{
				"Longitude": "0",
				"Latitude": "0",
				"HorizontalAccuracy": "0",
				"Altitude": "0",
				"AltitudeAccuracy": "0",
				"Timestamp": "0",
				"Heading": "0",
				"Speed": "0",
				"Status": "1"
			}
		],
		"DeviceModel": "SM-G973",
		"MultitaskingSupported": true,
		"DeviceName": "0000000",
		"DeviceSystemName": "Android",
		"DeviceSystemVersion": "28",
		"Languages": "ru_RU",
		"WiFiMacAddress": generateHex('00:a0:c6:xx:xx:xx', hex.substr(0, 6)),
		"WiFiNetworksData": {
			"BBSID": generateHex('02:00:00:xx:xx:xx', hex.substr(6, 12)),
			"SignalStrength": "" + Math.floor(-30 - Math.random() * 20),
			"Channel": "8",
			"SSID": "TPLink"
		},
		"CellTowerId": "" + (12875 + Math.floor(Math.random()*10000)),
		"LocationAreaCode": "9722",
		"ScreenSize": "1440x3040",
		"AppKey": "31b24386-dd60-3ed3-a900-5fca8f98fa84",
		"MCC": "250",
		"MNC": "02",
		"OS_ID": hex.substring(12, 16),
		"SDK_VERSION": "1.5.1.257",
		"MultitaskingSupported":true,
		"AdvertiserId":"3353eed1-c767-32bf-89c1-aa936375551d",
		"OS_ID":"f7cc5b905e4d388c",
		"Compromised": 0,
		"Emulator": 0,
		"DeveloperTools":0,
		"GooglePlayProtect":-1,
		"HoursSinceZoomInstall":-1,
		"HoursSinceQSInstall":-1,
		"HoursSinceAnyDeskInstall":-1,
		"UnknownSources":-1,
		"AgentBrand":"Samsung",
		"AgentBootTime":"83285",
		"TimeZone":"0",
		"SupportedAPILevel":"28",
		"OSCodeName":"Android Pie",
		"AgentAppInfo":"СберБанк 11.13.0",
		"ApprepInstalledApps":"114",
		"OSFontsNumber":"234",
		"OSFontsHash":-1313735598,
		"ScreenColorDepth":"~550dpi",
		"TimeZoneDSTOffset":"0",
		"SimCard":"1",
		"AgentSignalStrengthCellular":"-1",
		"AgentConnectionType":"WIFI",
		"AgentSignalTypeCellular":"-1",
		"LocalIPv4":"192.168.0.250",
		"LocalIPv6":"fe80::02a0:c6ff:feb3:9791",
		"DnsIP":"10.0.2.3",
		"ApplicationMD5":"7961c3913fd720d20171b2915aa49b06",
		"RdpConnection":"0",
		"InstallationSource":"com.android.vending",
		"LocationHash":"4b92a30e9d39579fcdaf1be41448ccc259a3d1a5712c77358aedbe99036dd9ce"
	};
	
	return obj;
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
				'password': pin,
				'mobileSdkData': JSON.stringify(createSdkData())
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
		var sdkData = createSdkData();
		var html = requestApiLogin('registerApp.do', {
			'operation':'register',
			'login':prefs.login,
			'devID':devid,
			'mobileSdkData': JSON.stringify(sdkData),
			mobileSDKKAV:  JSON.stringify({
				"model":"SM-G973",
				"androidId":"f7cc5b905e4d388c",
				"locale":"ru_RU",
				"osVersion":28,
				"phoneCellId":"{MMC=250, MNC=02,LAC=39395,CID=20391}",
				"simSerialNumber":sdkData.SIM_ID,
				"KavSdkId":"F7D87E55-B687-475C-AC62-0CBD5D9CA219",
				"KavSdkVersion":"5.10.0.1413",
				"KavSdkVirusDBVersion":"SdkVirusDbInfo(year=2021, month=3, day=16, hour=7, minute=8, second=0, knownThreatsCount=-1,records=338516,size=0)",
				"KavSdkVirusDBStatus":"NO_UPDATE_NEEDED",
				"KavSdkVirusDBStatusDate":"2021-10-21 17:33:9",
				"KavSdkRoot":false,
				"LowPasswordQuality":false,
				"NonMarketAppsAllowed":false,
				"UsbDebugOn":false,
				"ScanStatus":"FULL",
				"WiFiMAC":sdkData.WiFiMacAddress
			}),
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
			'mobileSdkData': JSON.stringify(createSdkData())

		});
		AnyBalance.trace('Успешно привязали устройство. Создадим PIN...');
		
		html = requestApiLogin('registerApp.do', {
			'operation':'createPIN',
			'mGUID':mGUID,
			'password':pin,
			'isLightScheme':'true',
			'devID':devid,
			'mobileSdkData': JSON.stringify(createSdkData())
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
        AnyBalance.trace('Найдена карта ' + num + ' (' + name + '), id: ' + id);

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
            getParam(elem, t, 'cards.transactions10.date', /<date>([\s\S]*?)<\/date>/i, replaceTagsAndSpaces, parseDate);
            getParam(elem, t, 'cards.transactions10.sum', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
            getParam(elem, t, ['cards.transactions10.currency', 'cards.transactions10.sum'], /<currency>\s*<code>([\s\S]*?)<\/code>/i, replaceTagsAndSpaces);
            getParam(elem, t, 'cards.transactions10.descr', /<description>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/description>/i, replaceTagsAndSpaces);

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
            getParam(elem, t, 'accounts.transactions10.date', /<date>([\s\S]*?)<\/date>/i, replaceTagsAndSpaces, parseDate);
            getParam(elem, t, 'accounts.transactions10.sum', /<amount>([\s\S]*?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
            getParam(elem, t, ['accounts.transactions10.currency', 'accounts.transactions10.sum'], /<currency>\s*<code>([\s\S]*?)<\/code>/i, replaceTagsAndSpaces);
            getParam(elem, t, 'accounts.transactions10.descr', /<description>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/description>/i, replaceTagsAndSpaces);

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
        sumParam(xml, info, 'info.fio', /<firstName>([\s\S]*?)<\/firstName>/i, replaceTagsAndSpaces, null, joinSpaces);
        sumParam(xml, info, 'info.fio', /<patrName>([\s\S]*?)<\/patrName>/i, replaceTagsAndSpaces, null, joinSpaces);
        sumParam(xml, info, 'info.fio', /<surName>([\s\S]*?)<\/surName>/i, replaceTagsAndSpaces, null, joinSpaces);

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

function processThanksAPI(result){
	if (AnyBalance.isAvailable('spasibo')) {
		var html = requestApi('private/profile/loyaltyURL.do');
		
		var url = getParam(html, null, null, /<url>([^<]{10,})/i, replaceTagsAndSpaces);
		if(url) {
			html = AnyBalance.requestGet(url);
			getParam(getElement(html, /<[^>]+balance-banner/i), result, 'spasibo', null, replaceTagsAndSpaces, parseBalance);
		} else {
			AnyBalance.trace("Не удалось найти ссылку на программу спасибо, сайт изменен?");
		}
	}
}