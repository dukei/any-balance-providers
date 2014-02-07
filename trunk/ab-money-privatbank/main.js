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


function requestJson(data, action, errorMessage) {
	var params = [];
	for (var name in data) {
		params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
	}
	// Заполняем параметры, которые есть всегда
	params.push(encodeURIComponent('appkey') + '=' + encodeURIComponent(g_appKey));
	params.push(encodeURIComponent('version') + '=' + encodeURIComponent('4.12.0'));
	params.push(encodeURIComponent('ireal') + '=' + encodeURIComponent('000000000000000'));
	params.push(encodeURIComponent('device') + '=' + encodeURIComponent('google_sdk|Cunknown'));
	params.push(encodeURIComponent('imei') + '=' + encodeURIComponent(g_login_hash));
	
	var html = AnyBalance.requestGet(g_baseurl + 'iapi2/' + action + '?' + params.join('&'), g_headers);
	var json = getJson(html);
	
	if(json.st != 'ok' && errorMessage)
		throw new AnyBalance.Error(errorMessage + ': ' + json.err);	
	
	return json;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	g_login_hash = hex_md5(prefs.login);
	g_login_hash = getParam(g_login_hash, null, null, null, [/([\s\S]{8})([\s\S]{4})([\s\S]{4})([\s\S]{4})([\s\S]{12})/, '$1-$2-$3-$4-$5']);
	AnyBalance.trace('Login imei param is: ' + g_login_hash);
	
	var json = requestJson({cookie:'',registration_id:g_registrationId}, 'props');
	// Если еще привязка не выполнялась, надо привязать
	if(/phone not linked to imei/i.test(json.err)) {
		json = requestJson({cookie:'', phone:prefs.login}, 'link_phone_prp', 'Не удалось начать процесс привязки, обратитесь к разработчикам.');
		// Все, тут надо дождаться смс кода
		var code = AnyBalance.retrieveCode("Пожалуйста, введите код из смс, для привязки данного устройства.");
		json = requestJson({cookie:'',phone:prefs.login,otp:code}, 'link_phone_cmt', 'Не удалось привязать устройство, обратитесь к разработчикам.');
		AnyBalance.trace('Успешно привязали устройство. Пробуем получить данные снова.');
		json = requestJson({cookie:'',registration_id:g_registrationId}, 'props');
	}
	AnyBalance.trace('Похоже что устройство уже привязано.');
	json = requestJson({cookie:''}, 'banks');
	json = requestJson({cookie:'',pass:prefs.password,bank:''}, 'chpass', 'Не удалось авторизоваться, проверьте логин и пароль.');
	
	var sessionCookie = json.cookie;
	if(!sessionCookie)
		throw new AnyBalance.Error('Не удалось получить токен авторизации, обратитесь к разработчикам.');
	
	json = requestJson({cookie:sessionCookie, email:'',	registration_id:g_registrationId}, 'props');
	
	AnyBalance.trace('Всего карт: ' + json.cards.length);
	
	var card;
	for(var i = 0; i < json.cards.length; i++) {
		card = json.cards[i];
		var number = card.number;
		if(!prefs.cardnum) {
			AnyBalance.trace('Не указан номер карты, получаем только первую.');
			break;
		} else {
			if(prefs.cardnum == number) {
				AnyBalance.trace('Нашли нужную карту ' + prefs.cardnum);
				break;
			} else {
				AnyBalance.trace('Карта ' + number + ' не совпадает с нужной ' + prefs.cardnum);
			}
		}
	}
	var result = {success: true};
	
	getParam(card.alias + ' ' + card.number, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(card.number, result, 'card_number', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(card.alias, result, 'card_name', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(card.balance+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(card.currency, result, ['currency', 'balance'], null, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}