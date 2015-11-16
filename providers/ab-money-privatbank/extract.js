/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'User-Agent': 'android-async-http/1.4.1 (http://loopj.com/android-async-http)',
};

var g_appKey = 'tj6rtymr67yjrt76tyherhdbryj6r46';
var g_registrationId = 'APA91bH8FeDpuVIxtiMvmG4Vxj1NksVvTlWtfR1a62aYLkZyiznaLWDzSrbW1xNVpT3LPvL8qSOuiej0UvGhOxswicz2';
var g_baseurl = 'https://napi.privatbank.ua/';
var g_login_hash = '';
var g_imei = '35374906******L';
var g_session = '';

function requestJson(data, action, errorMessage) {
	var params = [];
	for (var name in data) {
		params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
	}
	// Заполняем параметры, которые есть всегда
	params.push(encodeURIComponent('cookie') + '=' + '');
	params.push(encodeURIComponent('imei') + '=' + encodeURIComponent(g_login_hash));
	params.push(encodeURIComponent('appkey') + '=' + encodeURIComponent(g_appKey));
	params.push(encodeURIComponent('language') + '=' + 'ru');
	params.push(encodeURIComponent('lon') + '=' + '0.0');
	params.push(encodeURIComponent('device') + '=' + encodeURIComponent('SM-G900F|samsung'));
	params.push(encodeURIComponent('version') + '=' + encodeURIComponent('5.05.05'));
	params.push(encodeURIComponent('versionOS') + '=' + encodeURIComponent('5.0'));
	params.push(encodeURIComponent('lat') + '=' + encodeURIComponent('0.0'));
	params.push(encodeURIComponent('ireal') + '=' + encodeURIComponent(g_imei));
	
	var html = AnyBalance.requestGet(g_baseurl + 'iapi2/' + action + '?' + params.join('&'), g_headers);
	var json = getJson(html);
	
	if(json.st != 'ok' && errorMessage)
		throw new AnyBalance.Error(errorMessage + ': ' + json.err);	
	
	return json;
}

function login(prefs, result) {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var login_hash = hex_md5(prefs.login); //Чтобы на сервере работало
	AnyBalance.trace(login_hash + ' ' + typeof(login_hash));

	g_login_hash = getParam(login_hash, null, null, null, [/([\s\S]{8})([\s\S]{4})([\s\S]{4})([\s\S]{4})([\s\S]{12})/, '$1-$2-$3-$4-$5']);
	AnyBalance.trace('Login imei param is: ' + g_login_hash);
	
	var serial = (Math.abs(crc32(prefs.login) % 1000000)) + '';
	g_imei = getParam(g_imei, null, null, null, [/\*{6}/i, serial, /L/i, luhnGet(serial)]);
	AnyBalance.trace('Imei param is: ' + g_imei);
	
	var json = requestJson({cookie:'', registration_id:g_registrationId}, 'props');
	// Если еще привязка не выполнялась, надо привязать
	if(/phone not linked to imei/i.test(json.err)) {
		json = requestJson({cookie:'', phone:prefs.login}, 'link_phone_prp', 'Не удалось начать процесс привязки, обратитесь к разработчикам.');
		// Все, тут надо дождаться смс кода
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из смс, для привязки данного устройства.', null, {time: 300000});
		json = requestJson({cookie:'',phone:prefs.login,otp:code}, 'link_phone_cmt', 'Не удалось привязать устройство, обратитесь к разработчикам.');
		AnyBalance.trace('Успешно привязали устройство. Пробуем получить данные снова.');
		json = requestJson({cookie:'',registration_id:g_registrationId}, 'props');
	}
	AnyBalance.trace('Похоже что устройство уже привязано.');
	
	json = requestJson({cookie:''}, 'banks');
	json = requestJson({cookie:'',pass:prefs.password,bank:''}, 'chpass', 'Не удалось авторизоваться, проверьте логин и пароль.');
	
	g_session = json.cookie;
	if(!g_session)
		throw new AnyBalance.Error('Не удалось получить токен авторизации, обратитесь к разработчикам.');
	
	json = requestJson({cookie:g_session, email:'',	registration_id:g_registrationId}, 'props');
	
	getParam(json.phone, result, 'phone');
	
	return json;
}

function processCards(json, result){
    if(!AnyBalance.isAvailable('cards'))
    	return;

	var cards = json.cards;
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	// Здесь можно получить детальную информацию по картам
	var jsonDetailed = requestJson({cookie:g_session}, 'allcard_info');
	
	var jsonTransactions = {};
	if(AnyBalance.isAvailable('cards.transactions'))
		jsonTransactions = requestJson({cookie:g_session,types:'payment,liqpay,send2phone',weeks:'270'}, 'arhive');
	
	for(var i=0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.card_id;
		var title = card.alias + ' ' + card.number;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processCard(card, c, findCardDetails(_id, jsonDetailed.cards), jsonTransactions);
		}
		
		result.cards.push(c);
	}	
}

function processCard(card, c, cardDetails, jsonTransactions) {
	getParam(card.balance + '', c, 'cards.balance', null, null, parseBalanceSilent);
	getParam(card.number, c, 'cards.cardnum');
	getParam(card.currency, c, 'cards.currency');
	getParam(card.is_nfc, c, 'cards.is_nfc', null, null, parseBoolean);
	getParam(card.is_foreign, c, 'cards.is_acc_foreign', null, null, parseBoolean);
	getParam(card.rate + '', c, 'cards.rate', null, null, parseBalanceSilent);
	
	if(cardDetails){
		getParam(cardDetails.CARDSTATUS, c, 'cards.status');
		getParam(cardDetails.type, c, 'cards.type');
		getParam(cardDetails.is_credit, c, 'cards.is_credit');
		getParam(cardDetails.finlimit+'', c, 'cards.limit', null, null, parseBalanceSilent);
		getParam(cardDetails.holded+'', c, 'cards.available', null, null, parseBalanceSilent);
		getParam(cardDetails.min_pay+'', c, 'cards.min_pay', null, null, parseBalanceSilent);
		// Если кредитная карта - надо брать баланс из детализации
		if(cardDetails.is_credit) {
			getParam(cardDetails.balance + '', c, 'cards.balance', null, null, parseBalanceSilent);
			getParam(cardDetails.ccy + '', c, ['cards.currency', 'cards.balance']);
		}
	}
	
	if(AnyBalance.isAvailable('cards.transactions'))
		processCardTransactions(card, c, jsonTransactions);
}

function parseBoolean(str) {return str == "1"}

function findCardDetails(cardId, details){
	// Теперь найдем детальную информацию, разделил на два цикла, т.к. не всегда json.cards[i] соответвовал jsonDetailed.cards[i];
	for(var j = 0; j < details.length; j++) {
		var cardDetails = details[j];
		if(cardId == cardDetails.cardid) {
		    return cardDetails;
		}
	}
	return null;
}

var makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

var crc32 = function(str) {
    var crcTable = window.crcTable || (window.crcTable = makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

function luhnGet(num) {
	var arr = [],
	num = num.toString();
	for(var i = 0; i < num.length; i++) {
		if(i % 2 === 0) {
			var m = parseInt(num[i]) * 2;
			if(m > 9) {
				arr.push(m - 9);
			} else {
				arr.push(m);
			} 
		} else {
			var n = parseInt(num[i]);
			arr.push(n)
		}
	}
	
	var summ = arr.reduce(function(a, b) { return a + b; });
	return (summ % 10);
}