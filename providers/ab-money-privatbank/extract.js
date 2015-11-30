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
var g_simsn = '897010266********L';
var g_session = '';

function requestJson(data, action, errorMessage) {
	var params = [];
	for (var name in data) {
		params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
	}
	// Заполняем параметры, которые есть всегда
	params.push(encodeURIComponent('cookie') + '=' + encodeURIComponent(g_session));
	params.push(encodeURIComponent('simSN') + '=' + encodeURIComponent(g_simsn));
	params.push(encodeURIComponent('imei') + '=' + encodeURIComponent(g_login_hash));
	params.push(encodeURIComponent('appkey') + '=' + encodeURIComponent(g_appKey));
	params.push(encodeURIComponent('language') + '=' + 'ru');
	params.push(encodeURIComponent('lon') + '=' + '0.0');
	params.push(encodeURIComponent('device') + '=' + encodeURIComponent('SM-G900F|samsung'));
	params.push(encodeURIComponent('version') + '=' + encodeURIComponent('5.05.05'));
	params.push(encodeURIComponent('versionOS') + '=' + encodeURIComponent('5.0'));
	params.push(encodeURIComponent('lat') + '=' + encodeURIComponent('0.0'));
	params.push(encodeURIComponent('ireal') + '=' + encodeURIComponent(g_imei));

	var url = g_baseurl + 'iapi2/' + action + '?' + params.join('&');
	var html = AnyBalance.requestGet(url, g_headers);
	var json = getJson(html);
	
	if(json.st != 'ok') {
		AnyBalance.trace('Error getting ' + url + ': ' + JSON.stringify(json));
		if (errorMessage)
			throw new AnyBalance.Error(errorMessage + ': ' + (json.err || '').replace(/:\s[^&]&/, ': '), null, /Неверный логин или пароль/i.test(json.err));
	}
	
	return json;
}

function login(prefs, result) {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(g_session) {
		AnyBalance.trace('Найдена активная сессия, проверим её.')
		var json = requestJson({registration_id: g_registrationId}, 'props_full');
		if(json.st != 'ok') {
			AnyBalance.trace('Сессия испорчена, будем заново авторизовываться');
			g_session = '';
		}else{
			AnyBalance.trace('Сессия действует, используем её.');
		}
	}

	if(!g_session) {
		var login_hash = hex_md5(prefs.login); //Чтобы на сервере работало
		AnyBalance.trace(login_hash + ' ' + typeof(login_hash));

		g_login_hash = getParam(login_hash, null, null, null, [/([\s\S]{8})([\s\S]{4})([\s\S]{4})([\s\S]{4})([\s\S]{12})/, '$1-$2-$3-$4-$5']);
		AnyBalance.trace('Login imei param is: ' + g_login_hash);

		var serial = (Math.abs(crc32(prefs.login) % 1000000)) + '';
		g_imei = g_imei.replace(/\*{6}/, serial);
		g_imei = g_imei.replace(/L/, luhnGet(g_imei.replace(/L/, '')));
		AnyBalance.trace('imei param is: ' + g_imei);

		serial = (Math.abs(crc32(prefs.login + 'simSN') % 100000000)) + '';
		g_simsn = g_simsn.replace(/\*{8}/, serial);
		g_simsn = g_simsn.replace(/L/, luhnGet(g_simsn.replace(/L/, '')));
		AnyBalance.trace('simSN param is: ' + g_simsn);

		var json = requestJson({registration_id: g_registrationId}, 'props_full');
		// Если еще привязка не выполнялась, надо привязать
		if (/phone not linked to imei/i.test(json.err)) {
			AnyBalance.trace('Устройство нужно привязать.');
			json = requestJson({}, 'unlink_phone');

			json = requestJson({login: prefs.login}, 'auth_phone', 'Не удалось начать процесс привязки');
			var id = json.id;
			json = requestJson({id: id, pass: prefs.password}, 'auth_pass', 'Не удалось зайти с паролем');
			// Все, тут надо дождаться смс кода
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код из смс, для привязки данного устройства.', null, {time: 300000});
			json = requestJson({id: id, otp: code}, 'auth_otp', 'Не удалось привязать устройство');

			g_session = json.cookie;

			AnyBalance.trace('Успешно привязали устройство.');
		} else {
			AnyBalance.trace('Похоже что устройство уже привязано.');

			json = requestJson({
				pass: prefs.password,
				bank: ''
			}, 'chpass', 'Не удалось авторизоваться, проверьте логин и пароль.');
			g_session = json.cookie;
		}

		__setLoginSuccessful();
	}else{
		AnyBalance.trace()
	}

	if (!g_session)
		throw new AnyBalance.Error('Не удалось получить токен авторизации!');

	json = requestJson({}, 'banks');
	json = requestJson({registration_id: g_registrationId}, 'props_full');

	getParam(json.phone, result, 'phone');
	
	return json;
}

function processCards(json, result){
    if(!AnyBalance.isAvailable('cards'))
    	return;
   //Не получаются карты ни хрена!
	var cards = json.cards;
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.cardid;
		var title = card.alias + ' ' + card.number;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processCard(card, c);
		}
		
		result.cards.push(c);
	}	
}

function processCard(card, c, jsonTransactions) {
	getParam(card.holded + '', c, 'cards.balance', null, null, parseBalanceSilent);
	getParam(card.number, c, 'cards.cardnum');
	getParam(card.ccy, c, 'cards.currency');
	getParam(card.is_nfc, c, 'cards.is_nfc', null, null, parseBoolean);
	getParam(card.is_acc_foreign, c, 'cards.is_foreign', null, null, parseBoolean);
	getParam(card.rate + '', c, 'cards.rate', null, null, parseBalanceSilent);
	
	getParam(card.status, c, 'cards.status');
	getParam(card.type, c, 'cards.type');
	getParam(card.is_credit, c, 'cards.is_credit');
	getParam(card.finlimit+'', c, 'cards.limit', null, null, parseBalanceSilent);
	getParam(card.min_pay+'', c, 'cards.min_pay', null, null, parseBalanceSilent);

	if(AnyBalance.isAvailable('cards.transactions'))
		processCardTransactions(card, c);
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
    var crcTable = makeCRCTable();
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