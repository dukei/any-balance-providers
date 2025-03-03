/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_status = {
	'active': 'Активен',
	'inactive': 'Не активен',
	'blocked': 'Заблокирован',
	'arrested': 'Арестован',
	'OPENED': 'Действующий',
	'CLOSED': 'Закрытый',
	'': 'Неизвестен'
};

var g_type = {
	'debit': 'Дебетовая',
	'credit': 'Кредитная',
	'': 'Неизвестен'
};

var g_system = {
	'MIR': 'МИР',
	'MASTERCARD': 'MasterCard',
	'MC': 'MasterCard',
	'VS': 'VISA',
	'': 'Неизвестен'
};

var g_info;

function requestApiLogin(action, params, ignoreErrors) {
	var baseurl = 'https://online.sberbank.ru:4477/CSAMAPI/';
	return requestApiInner(baseurl + action, params, false, ignoreErrors);
}

function requestApi(action, params, ignoreErrors) {
	var baseurl = 'https://mobile-node5.online.sberbank.ru:8543/';
	return requestApiInner(baseurl + action, params, true, ignoreErrors);
}

function requestApiInner(url, params, no_default_params, ignoreErrors) {
	var m_headers = {
		'Accept': '*/*',
		'Accept-Charset': 'UTF-8',
		'Accept-Language': 'ru-RU;q=1, en-RU;q=0.9',
		'Connection': 'keep-alive',
		'User-Agent': 'Mobile Device'
	}, newParams;
	
	if(no_default_params){
		m_headers['Content-Type'] = 'application/json;charset=UTF-8';
		newParams = JSON.stringify(params);
	}else{
		m_headers['Content-Type'] = 'application/x-www-form-urlencoded';
		newParams = joinObjects(params, {
			'version':'9.20',
			'appType':'android',
			'appVersion':'16.0.0',
			'deviceName':'SM-G973',
		});
	}
	
	AnyBalance.trace('Запрос: ' + url);
	
	var html = AnyBalance.requestPost(url, newParams, m_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('СберБанк Онлайн временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/session\/create/i.test(url))
	    AnyBalance.trace('Ответ: ' + html);
	
    if(no_default_params){
		var json = getJson(html);
        
		if(!json.success || json.success !== true){
		    var error = (json.error && json.error.description) || (((json.status && json.status.errors) || []).map(function(e) { return e.description }).join('\n'));
		    if(error)
			    throw new AnyBalance.Error(error, null, /идентификатор|парол|код/i.test(error));
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
        
	    return json;
	}else{
    	var code = getParam(html, null, null, /<status>\s*<code>\s*(-?\d+)\s*<\/code>/i, null, parseBalance);
	    
	    if(!/<status>\s*<code>\s*0\s*<\/code>/i.test(html)){
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
}

function getToken(html) {
	var token = getParam(html, null, null, /<token>([^<]+)<\/token>/i);
	if(!token) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось получить токен авторизации. Сайт изменен?");
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

/*	mobileSdkData: '{"TIMESTAMP":"2021-10-21T17:33:9Z","HardwareID":"354809109338562","SIM_ID":"8970101662005544490","PhoneNumber":"","DeviceModel":"SM-G973","DeviceName":"0000000","DeviceSystemName":"Android","DeviceSystemVersion":"28","Languages":"ru_RU",
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
			"SignalStrength": "" + Math.floor(-50),
			"Channel": "8",
			"SSID": "TPLink"
		},
		"LocationAreaCode": "9722",
		"ScreenSize": "1440x3040",
		"AppKey": "31b24386-dd60-3ed3-a900-5fca8f98fa84",
		"MCC": "250",
		"MNC": "02",
		"OS_ID": hex.substr(12, 16),
		"SDK_VERSION": "1.5.1.257",
		"AdvertiserId":"3353eed1-c767-32bf-89c1-aa936375551d",
		"Compromised": 0,
		"Emulator": 0,
		"DeveloperTools":0,
		"GooglePlayProtect":-1,
		"HoursSinceZoomInstall":-1,
		"HoursSinceQSInstall":-1,
		"HoursSinceAnyDeskInstall":-1,
		"UnknownSources":-1,
		"AgentBrand":"Samsung",
		"AgentBootTime":"" + ((Math.floor(+dt/1000) % 86400) + Number.parseInt(hex.substr(28, 4), 16)),
		"TimeZone":"0",
		"SupportedAPILevel":"28",
		"OSCodeName":"Android Pie",
		"AgentAppInfo":"СберБанк 16.0.0",
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
		"LocationHash":"5028545054d6644b9c2f990c278b14f6beaa8bc0f4b7c17eb373ec3903855514"
	};
	
	return obj;
}

function loginAPI() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	
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

	if(guid){
		AnyBalance.trace('Устройство уже привязано к СберБанк Онлайн');
		AnyBalance.trace('guid param is: ' + guid);
		
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
			    AnyBalance.trace(e.message + ': Требуется пересоздать guid');
			    guid = null;
			}else{
				throw e;
			}
		}
	}

	if(!guid){
		AnyBalance.trace('Требуется привязка устройства к СберБанк Онлайн');

		// регистрируем девайс
		var sdkData = createSdkData();
		var dt = new Date();
		var html = requestApiLogin('registerApp.do', {
			'operation':'register',
			'login':prefs.login,
			'devID':devid,
			'mobileSdkData': JSON.stringify(sdkData),
			mobileSDKKAV:  JSON.stringify({
				"model":"SM-G973",
				"androidId":sdkData.OS_ID,
				"locale":"ru_RU",
				"osVersion":28,
				"phoneCellId":"{MMC=250, MNC=02,LAC=39395,CID=20391}",
				"simSerialNumber":sdkData.SIM_ID,
				"KavSdkId":"F7D87E55-B687-475C-AC62-0CBD5D9CA219",
				"KavSdkVersion":"5.10.0.1413",
				"KavSdkVirusDBVersion":"SdkVirusDbInfo(year=2021, month=3, day=16, hour=7, minute=8, second=0, knownThreatsCount=-1,records=338516,size=0)",
				"KavSdkVirusDBStatus":"NO_UPDATE_NEEDED",
				"KavSdkVirusDBStatusDate":dt.getUTCFullYear() + '-' + n2(dt.getUTCMonth()) + '-' + n2(dt.getUTCDate()) + ' ' + dt.getUTCHours() + ':' + dt.getUTCMinutes() + ':' + dt.getUTCSeconds(),
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
			throw new AnyBalance.Error('Не удалось получить токен регистрации. Сайт изменен?');
		}
		
		AnyBalance.setData('guid', mGUID);
		AnyBalance.trace('mGUID param is: ' + mGUID);
		//AnyBalance.saveData(); Нельзя здесь сохранять! Только после успешного ввода кода!

		// Все, тут надо дождаться смс кода
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из SMS для привязки устройства к СберБанк Онлайн', null, {
			time: 120000,
			inputType: 'number',
		});
		
		html = requestApiLogin('registerApp.do', {
			'operation':'confirm',
			'mGUID':mGUID,
			'smsPassword':code,
			'mobileSdkData': JSON.stringify(createSdkData())

		});
        
		AnyBalance.trace('Успешно привязали устройство. Создаем PIN-код для входа...');
		
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
    
	AnyBalance.trace('Успешно получили токен авторизации. Создаем новую сессию...');
	
	var json = requestApi('sm-uko/v3/mobile/gzip/session/create', {'version': '16.0.0', 'platform': 'android', 'token': token}); // Открываем новую сессию
    
	g_info = json.body && json.body.clientInfo && json.body.clientInfo.person; // Информацию о пользователе только здесь можно получить
	
	AnyBalance.trace('clientInfo: ' + JSON.stringify(g_info));
	
	return token, g_info;
}

var g_products;

function getProductsJsonApi(){
	if(!g_products){
	    var json = requestApi('main-screen/rest/v2/mobile/section/meta', {"withData": true, "forceUpdate": false});
		g_products = json.body && json.body.sections && json.body.sections.technicalSection && json.body.sections.technicalSection.sectionProductData;
		
		if(!g_products){
			AnyBalance.trace(JSON.stringify(json));
		    throw new AnyBalance.Error('Не удалось получить список продуктов. Сайт изменен?');
		}
	}
	return g_products;
}

function processCardsAPI(result) {
    if(!AnyBalance.isAvailable('cards'))
        return;
	
    var json = getProductsJsonApi();

    result.cards = [];
	
	var cards;
	
    if(json.cardsInWallet && json.cardsInWallet.data && json.cardsInWallet.data.length && json.cardsInWallet.data.length > 0){
		cards = json.cardsInWallet.data;
		AnyBalance.trace('Найдено карт: ' + cards.length);
	}else{	
        AnyBalance.trace('Карты не обнаружены');
        return;
    }
    
    for(var i = 0; i < cards.length; i++){
        var card = cards[i];
        var id = card.id;
        var num = card.number;
        var name = card.name;
        AnyBalance.trace('Найдена карта ' + num + ' (' + name + '), id: ' + id);

        var c = {
            __id: id,
            __name: name + ' ' + num,
            cardNumber: num
        };

        if(__shouldProcess('cards', c)){
            processCardAPI(card, c);
            result.cards.push(c);
        }
    }
}

function processCardAPI(card, result) {
    AnyBalance.trace('Обрабатываем карту ' + result.__name);
    
	var avail = card.availableLimit;
    getParam(avail.amount, result, 'cards.balance', null, null, parseBalance);
    getParam(avail.currency.code, result, ['cards.currency', 'cards.balance'], null, null, myParseCurrency);
	
	getParam(g_status[card.state]||card.state, result, 'cards.status');
    getParam(g_type[card.type]||card.type, result, 'cards.type');
	getParam(card.cardHolder, result, 'cards.holderName');
	
	try{
	    var json = requestApi('ufs-carddetail/rest/card/v1/cardInfo', {'cardIds': [result.__id]});
	    
	    var cardDetails = json.body && json.body.cardDetails && json.body.cardDetails.cards && json.body.cardDetails.cards[0];
	}catch(e){
        AnyBalance.trace('Не удалось получить информацию по карте ' + result.__name + ': ' + e.message);
    }
	
	if(cardDetails){
	    if(!avail){
            avail = cardDetails.limits.availableLimit;
			getParam(avail.amount, result, 'cards.balance', null, null, parseBalance);
            getParam(avail.currency.code, result, ['cards.currency', 'cards.balance'], null, null, myParseCurrency);
	    }
		
		if(AnyBalance.isAvailable('cards.status', 'cards.type')){
		    getParam(g_status[cardDetails.state]||cardDetails.state, result, 'cards.status');
            getParam(g_type[cardDetails.type]||cardDetails.type, result, 'cards.type');
	    }
		
		if(AnyBalance.isAvailable('cards.limit') && cardDetails.type == 'credit'){
            avail = cardDetails.creditType && cardDetails.creditType.creditLimit && cardDetails.creditType.creditLimit.amount;
            getParam(avail||0, result, 'cards.limit', null, null, parseBalance);
	    }
        
        if(AnyBalance.isAvailable('cards.electrocash')){
	        avail = cardDetails.limits && cardDetails.limits.purchaseLimit && cardDetails.limits.purchaseLimit.amount;
            getParam(avail||0, result, 'cards.electrocash', null, null, parseBalance);
	    }
		
		if(AnyBalance.isAvailable('cards.payment_system')){
            getParam(g_system[cardDetails.paySystemType]||cardDetails.paySystemType, result, 'cards.payment_system');
	    }
                
        if(AnyBalance.isAvailable('cards.accnum', 'cards.till', 'cards.cardName')){
            getParam(cardDetails.cardAccount, result, 'cards.accnum');
	        getParam(cardDetails.expireDate, result, 'cards.till', null, null, parseDate);
	        getParam(cardDetails.name, result, 'cards.cardName');
	    }
		
		if(cardDetails.creditType){
		    if(AnyBalance.isAvailable('cards.minpay', 'cards.minpay_till')){
	            avail = cardDetails.creditType.creditMinPayment && cardDetails.creditType.creditMinPayment.amount;
                getParam(avail||0, result, 'cards.minpay', null, null, parseBalance);
                
	            getParam(cardDetails.creditType.creditMinPaymentDate, result, 'cards.minpay_till', null, null, parseDate);
	        }
			
			if(AnyBalance.isAvailable('cards.debt', 'cards.debt_date')){
	            avail = cardDetails.creditType.creditDebt && cardDetails.creditType.creditDebt.amount;
                getParam(avail||0, result, 'cards.debt', null, null, parseBalance);
				
				if(cardDetails.creditType && cardDetails.creditType.creditMinPaymentDate){
				    var date = cardDetails.creditType.creditMinPaymentDate.replace(/(\d{2}).(\d{2}).(\d{4})/, '$3-$2-$1');
				    var dtNextMinPayment = new Date(date); // Рассчитываем дату отчёта о задолженности (минус месяц от даты следующего платежа плюс 1 день)
                    var dtPrevDebtReport = new Date(dtNextMinPayment.getFullYear(), dtNextMinPayment.getMonth() - 1, dtNextMinPayment.getDate() + 1);
				    
				    getParam(fmtDate(dtPrevDebtReport), result, 'cards.debt_date', null, null, parseDate);
				}
	        }
			
			if(AnyBalance.isAvailable('cards.own')){
                avail = cardDetails.creditType.creditOwnSum && cardDetails.creditType.creditOwnSum.amount;
                getParam(avail||0, result, 'cards.own', null, null, parseBalance);
	        }
			
			if(AnyBalance.isAvailable('cards.gracepay', 'cards.gracepay_till')){
				try{
					var json = requestApi('credit_cards_dsmo/mobile/v1/grace/efs/getCreditCardDebtsResults', {'cardId': result.__id + ''});
				    
	                var debtsInfo = json.body && json.body.debtsInfo && json.body.debtsInfo.screens;
				    
				    if(debtsInfo && debtsInfo.length && debtsInfo.length > 0){
                        for(var i = 0; i < debtsInfo.length; i++){
                            var screen = debtsInfo[i];
                            
						    if(screen.type == 'DEBT_DETAIL'){
							    if(screen.widgets && screen.widgets.length && screen.widgets.length > 0){
							        for(var j = 0; j < screen.widgets.length; j++){
                                        var widget = screen.widgets[j];
								        
								        if(widget.role && widget.role == 'grace-info'){
									        getParam(widget.headers[0].amount||0, result, 'cards.gracepay', null, null, parseBalance);
                                            getParam(widget.headers[0].title, result, 'cards.gracepay_till', null, null, parseDateWord);
											
											break;
								        }
								    }
							    }else{
						            AnyBalance.trace('Не удалось получить виджеты по задолженности');
					            }
						    }
                        }
		            }else{
						AnyBalance.trace('Не удалось получить экраны виджетов по задолженности');
					}
			    }catch(e){
                    AnyBalance.trace('Не удалось получить информацию по грейс-периоду: ' + e.message);
                }
			}
		}
	}
	
	if(AnyBalance.isAvailable('cards.transactions10')) {
        processCardAPITransactions(result);
    }
}

function processCardAPITransactions(result) {
    try {
        var json = requestApi('uoh-bh/v1/operations/list', {'paginationOffset': 0, 'paginationSize': 11, 'usedResource': ['card:' + result.__id]});
        
		if(json.body.operations && json.body.operations.length && json.body.operations.length > 0){
            AnyBalance.trace('Найдено последних операций: ' + json.body.operations.length);
            
            result.transactions10 = [];
            
            for(var i = 0; i < json.body.operations.length; i++){
                var oper = json.body.operations[i];
                var o = {};
				var corr = '';
				
				if(oper.fromResource && oper.toResource) // Это перевод между своими счетами, формируем направление
					corr = oper.fromResource.displayedValue + ' ➞ ' + oper.toResource.displayedValue;
				
                getParam(oper.date, o, 'cards.transactions10.date', null, null, parseDate);
                getParam(oper.operationAmount.amount, o, 'cards.transactions10.sum', null, null, parseBalance);
                getParam(oper.operationAmount.currencyCode, o, ['cards.transactions10.currency', 'cards.transactions10.sum'], null, null, myParseCurrency);
                getParam(corr ? corr : oper.correspondent, o, 'cards.transactions10.descr');
				getParam(oper.description, o, 'cards.transactions10.type');
                
                result.transactions10.push(o);
            }
		}
    }catch(e){
        AnyBalance.trace('Не удалось получить операции по карте ' + result.__name + ': ' + e.message);
    }
}

function processAccountsAPI(result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var json = getProductsJsonApi();

    result.accounts = [];
	
	var accounts;
	
	if(json.accounts && json.accounts.data && json.accounts.data.length && json.accounts.data.length > 0){
		accounts = json.accounts.data;
		AnyBalance.trace('Найдено счетов: ' + accounts.length);
	}else{
        AnyBalance.trace('Счета не обнаружены');
        return;
    }
    
    for(var i = 0; i < accounts.length; i++){
        var account = accounts[i];
        var id = account.id;
        var num = account.number;
        var name = account.name;
		AnyBalance.trace('Найден счет ' + num + ' (' + name + '), id: ' + id);

        var c = {
            __id: id,
            __name: name + ' ' + num,
            num: num
        };

        if(__shouldProcess('accounts', c)){
            processAccountAPI(account, c);
            result.accounts.push(c);
        }
    }
}

function processAccountAPI(account, result) {
    AnyBalance.trace('Обрабатываем счет ' + result.__name);
	
    var avail = account.balance;
    getParam(avail.amount, result, 'accounts.balance', null, null, parseBalance);
    getParam(avail.currency.code, result, ['accounts.currency', 'accounts.balance'], null, null, myParseCurrency);
    
	var availCash = account.availCash;
	getParam(availCash.amount||0, result, 'accounts.cash', null, null, parseBalance);
	
	getParam(account.rate, result, 'accounts.pct', null, null, parseBalance);
    getParam(account.closeDate, result, 'accounts.till', null, null, parseDate);
	
	getParam(g_status[account.state]||account.state, result, 'accounts.status');
	getParam(g_type[account.name]||account.name, result, 'accounts.type');
	getParam(account.name, result, 'accounts.cardName');
	
	try{
	    var json = requestApi('account/info/mobile/main', {'id': result.__id + ''});
        
	    var accountDetails = json.body;
	}catch(e){
        AnyBalance.trace('Не удалось получить информацию по счету ' + result.__name + ': ' + e.message);
    }
	
	if(accountDetails){
	    if(!avail){
			getParam(accountDetails.balance, result, 'accounts.balance', null, null, parseBalance);
            getParam(accountDetails.currency, result, ['accounts.currency', 'accounts.balance'], null, null, myParseCurrency);
	    }
		
		if(AnyBalance.isAvailable('accounts.balance_min')){
			getParam(accountDetails.minBalance, result, 'accounts.balance_min', null, null, parseBalance);
		}
		
		if(AnyBalance.isAvailable('accounts.pct_next_date') && accountDetails.percentsNextDate){
		    getParam(accountDetails.percentsNextDate, result, 'accounts.pct_next_date', null, null, parseDateWord);
		}
	}
	
	if(AnyBalance.isAvailable('accounts.transactions10')){
        processAccountAPITransactions(result);
    }
}

function processAccountAPITransactions(result) {
	try {
		var dt = new Date();
        var dtFrom = new Date(dt.getFullYear() - 1, dt.getMonth(), dt.getDate());
		
        var json = requestApi('uoh-bh/v1/operations/list', {
            'paginationOffset': 0,
            'paginationSize': 11,
            'from': fmtDate(dtFrom) + 'T00:00:00',
            'to': fmtDate(dt) + 'T23:59:59',
            'usedResource': [
                'account:' + result.__id
            ]
        });
        
		if(json.body.operations && json.body.operations.length && json.body.operations.length > 0){
            AnyBalance.trace('Найдено последних операций: ' + json.body.operations.length);
            
            result.transactions10 = [];
            
            for(var i = 0; i < json.body.operations.length; i++){
                var oper = json.body.operations[i];
                var o = {};
				var corr = '';
				
				if(oper.fromResource && oper.toResource) // Это перевод между своими счетами, формируем направление
					corr = oper.fromResource.displayedValue + ' → ' + oper.toResource.displayedValue;
				
                getParam(oper.date, o, 'accounts.transactions10.date', null, null, parseDate);
                getParam(oper.operationAmount.amount, o, 'accounts.transactions10.sum', null, null, parseBalance);
                getParam(oper.operationAmount.currencyCode, o, ['accounts.transactions10.currency', 'accounts.transactions10.sum'], null, null, myParseCurrency);
                getParam(corr ? corr : oper.correspondent, o, 'accounts.transactions10.descr');
				getParam(oper.description, o, 'accounts.transactions10.type');
                
                result.transactions10.push(o);
            }
		}
    }catch(e){
        AnyBalance.trace('Не удалось получить операции по счету ' + result.__name + ': ' + e.message);
    }
}

function processInfoAPI(result) {
    if(!AnyBalance.isAvailable('info'))
		return;
	
    var info = result.info = {};
    
    var person = g_info;
	
	if(person){
        var joinSpaces = create_aggregate_join(' ');
        sumParam(person.firstName, info, 'info.fio', null, null, capitalFirstLetters, joinSpaces);
        sumParam(person.middleName, info, 'info.fio', null, null, capitalFirstLetters, joinSpaces);
        sumParam(person.secondName, info, 'info.fio', null, null, capitalFirstLetters, joinSpaces);
    
        if(person.phones && person.phones[0])
	        getParam(person.phones[0], info, 'info.phone', null, [replaceTagsAndSpaces, /[^\d\*]/g, '', /(.*)(.{3})(.{3})(.{2})(.{2})$/, '+$1 $2 $3-$4-$5']);
	}else{
		AnyBalance.trace('Не удалось получить информацию о пользователе');
	}
}

function processRatesAPI(result) {
    if(!isAvailable(['eurPurch', 'eurSell', 'usdPurch', 'usdSell']))
		return;
	
	try{
        var json = requestApi('main-screen/rest/v2/mobile/section/data/currencyRates', {});
		
		var data = json.body.currencyRates.data;
		
		if(data && data.length && data.length > 0){
            for(var i = 0; i < data.length; i++){
                var allRates = data[i];
				
				if(allRates.type == 'ERNP-2' && allRates.description == 'CURRENCY_ACCOUNTS'){
				    for(var j = 0; j < allRates.rates.length; j++){
                        var info = allRates.rates[j];
						
						if(info.base == 'USD'){
							getParam(info.ranges[0].bid, result, 'usdPurch', null, null, parseBalance);
                            getParam(info.ranges[0].offer, result, 'usdSell', null, null, parseBalance);
						}else if(info.base == 'EUR'){
							getParam(info.ranges[0].bid, result, 'eurPurch', null, null, parseBalance);
                            getParam(info.ranges[0].offer, result, 'eurSell', null, null, parseBalance);
						}else{
							continue;
						}
                    }
					
					break;
				}else{
					continue;
				}
            }
		}
    }catch(e){
        AnyBalance.trace('Не удалось получить курсы валют: ' + e.message);
    }
}

function processSberPrimeAPI(result) {
    if(!AnyBalance.isAvailable('sberprime'))
		return;
    
	try{
        var json = requestApi('sberx-prime/api/v15/mainScreen', {'params': {'deeplinkType': 'openitsolutionsonline', 'platform': 'android'}});
	
        var sberprime = result.sberprime = {};
		
		if(json.body && json.body.subscribed && json.body.subscribed === true){
		    getParam(json.body.primes[0].additionalInfo, sberprime, 'sberprime.till', null, null, parseDate);
//          getParam(json.body.primes[0].priceCalculatedNext / 100, sberprime, 'sberprime.cost', null, null, parseBalance);
            getParam(json.body.primes[0].subscriptionName ? json.body.primes[0].subscriptionName : 'Подключена', sberprime, 'sberprime.state');
		}else{
			result.sberprime.state = 'Не подключена';
		}
	}catch(e){
        AnyBalance.trace('Не удалось получить информацию по подписке: ' + e.message);
    }
}

function processThanksAPI(result){
	if(!AnyBalance.isAvailable(['spasibo', 'miles', 'categories']))
	    return;
	
	try{
		var json = requestApi('loyaltyspasibo_registration_mb/v2/mob_bank/workflow-gate?cmd=START&name=balance', {});
		
		getParam(json.body.output.bonusBalance / 100, result, 'spasibo', null, null, parseBalance);
		getParam(json.body.output.milesBalance, result, 'miles', null, null, parseBalance);
		
		if(AnyBalance.isAvailable('categories')){
		    var json = requestApi('loyalty_three/v1/mob_bank/workflow-gate?cmd=START&name=myPrivileges', {'longitude': '0', 'latitude': '0'});
			
			var responce = json.body && json.body.output && json.body.output.myPrivilegesResponse;
		        
	        if(responce && responce.currentPrivilege && responce.currentPrivilege.privilegesList){
			    var privileges = responce.currentPrivilege.privilegesList;
			    
		        if(privileges.length && privileges.length > 0){
				    AnyBalance.trace('Найдено категорий: ' + privileges.length);
					
					for(var i=0; i<privileges.length; ++i){
	                    var privilege = privileges[i];
                        
			            sumParam(capitalizeFirstLetter(privilege.title.replace(/^[\s\S]*?%\s*/i, '').replace(/\s$/g, '')) 
			            + ': ' + privilege.title.replace(/%[\s\S]*?$/i, '').replace(/\s$/g, '') + '%', result, 'categories', null, null, null, create_aggregate_join(',<br> '));
			        }
				}else{
					result.categories = 'Категории не выбраны';
				}
			}else{
		        AnyBalance.trace('Не удалось найти информацию по категориям');
		        result.categories = 'Нет данных';
	        }
        }
	}catch(e){
        AnyBalance.trace('Не удалось получить СберСпасибо первым способом: ' + e.message + '.\n Пробуем получить информацию с главной страницы');
	    
		var json = getProductsJsonApi();
		
		var thanks = json.sberThanks && json.sberThanks.data && json.sberThanks.data[0] && json.sberThanks.data[0].balance;
		
		getParam(thanks.amount||0, result, 'spasibo', null, null, parseBalance);
    }
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}