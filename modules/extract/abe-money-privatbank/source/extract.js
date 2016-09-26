/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'User-Agent': 'android-async-http/1.4.1 (http://loopj.com/android-async-http)',
};

var g_appKey = 'afhgfgfdg56ujdj6rtymr67yjrt76tyherhdbryj6r46df57';
//var g_registrationId = 'APA91bH8FeDpuVIxtiMvmG4Vxj1NksVvTlWtfR1a62aYLkZyiznaLWDzSrbW1xNVpT3LPvL8qSOuiej0UvGhOxswicz2';
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
	params.push(encodeURIComponent('version') + '=' + encodeURIComponent('5.11.02'));
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

	var normalized_login = '+' + prefs.login.replace(/\D+/g, '');

	if(g_session) {
		AnyBalance.trace('Найдена активная сессия, проверим её.')
		var json = requestJson({/*registration_id: g_registrationId*/}, 'props_full');
		if(json.st != 'ok') {
			AnyBalance.trace('Сессия испорчена, будем заново авторизовываться');
			g_session = '';
		}else{
			AnyBalance.trace('Сессия действует, используем её.');
		}
	}

	if(!g_session) {
		var login_hash = hex_md5(normalized_login); //Чтобы на сервере работало
		AnyBalance.trace(login_hash + ' ' + typeof(login_hash));

		g_login_hash = getParam(login_hash, null, null, null, [/([\s\S]{8})([\s\S]{4})([\s\S]{4})([\s\S]{4})([\s\S]{12})/, '$1-$2-$3-$4-$5']);
		AnyBalance.trace('Login imei param is: ' + g_login_hash);

		g_imei = generateImei(normalized_login, g_imei);
		g_simsn = generateSimSN(normalized_login, g_simsn);

		var json = requestJson({/*registration_id: g_registrationId*/}, 'props_full');
		// Если еще привязка не выполнялась, надо привязать
		if (/phone not linked to imei/i.test(json.err)) {
			AnyBalance.trace('Устройство нужно привязать.');
			json = requestJson({}, 'unlink_phone');

			json = requestJson({login: normalized_login}, 'auth_phone', 'Не удалось начать процесс привязки');
			var id = json.id;
			json = requestJson({id: id, pass: prefs.password}, 'auth_pass', 'Не удалось зайти с паролем');
			// Все, тут надо дождаться смс кода
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код из смс, для привязки данного устройства.', null, {time: 300000});
			json = requestJson({id: id, otp: code}, 'auth_otp', 'Не удалось привязать устройство');

			g_session = json.cookie;

			AnyBalance.trace('Успешно привязали устройство: ' + JSON.stringify(json));
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
	json = requestJson({/*registration_id: g_registrationId*/}, 'props_full');

	if(AnyBalance.isAvailable('info.mphone')){
		result.info = {};
		getParam(json.phone, result.info, 'info.mphone');
	}
	
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
		
		var c = {__id: _id, __name: title, num: card.number};
		
		if(__shouldProcess('cards', c)){
			processCard(card, c);
		}
		
		result.cards.push(c);
	}	
}

function processCard(card, c, jsonTransactions) {
	getParam(card.holded + '', c, 'cards.balance', null, null, parseBalanceSilent);
	getParam(card.ccy, c, 'cards.currency');
	getParam(card.is_nfc, c, 'cards.is_nfc', null, null, parseBoolean);
	getParam(card.is_acc_foreign, c, 'cards.is_foreign', null, null, parseBoolean);
	getParam(card.rate + '', c, 'cards.pct', null, null, parseBalanceSilent);
	
	getParam(card.status, c, 'cards.status');
	getParam(card.type, c, 'cards.type');
	getParam(card.is_credit, c, 'cards.is_credit');
	getParam(card.finlimit+'', c, 'cards.limit', null, null, parseBalanceSilent);
	getParam(card.min_pay+'', c, 'cards.minpay', null, null, parseBalanceSilent);

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
