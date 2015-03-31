/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'User-Agent: Dalvik/1.6.0 (Linux; U; Android 4.0.4; sdk Build/MR1)',
};

var g_baseurl = 'https://www.prior.by/api/ibapi.axd?action=';

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var key = CryptoJS.enc.Base64.parse('Nm4wMy5nOiM3JSpWfnwzOXFpNzRcfjB5MVNEKl8mWkw=');
	var iv  = CryptoJS.enc.Base64.parse('OSMqNE11fGUoLDg5Mmk1WQ==');
	
	var tokenBase64 = AnyBalance.requestPost(g_baseurl + 'setup', {}, g_headers);
	checkEmpty(tokenBase64, 'Не удалось авторизоваться, сайт изменен?');
	
	var token = CryptoJS.enc.Base64.parse(tokenBase64);
	var encodedToken = CryptoJS.AES.encrypt(token, key, { iv: iv });
	
	var passHash = CryptoJS.SHA512(prefs.password);
	
	var xml = AnyBalance.requestPost(g_baseurl + 'login', {UserName: prefs.login, UserPassword: passHash.toString(), Token: encodedToken.toString()}, g_headers);
	
	if (!/UserSession/i.test(xml)) {
		var error = sumParam(xml, null, null, /<Error>([\s\S]*?)<\/Error/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	if(prefs.type == 'card')
		fetchCard(prefs, result);
	else if(prefs.type == 'contract')
		fetchContract(prefs, result);
	
	AnyBalance.setResult(result);
}

function fetchCard(prefs, result) {
	html = AnyBalance.requestPost(g_baseurl + 'GateWay&Target=Android', {Template: 'CardList'}, addHeaders({Base64Fields: 'XML'}));
	
	var re = new RegExp('<Card\\s+[^>]*>\\s*<Synonym>' + (prefs.num || '[^]+?') + '<\/Synonym>[^]*?<\/Card>', 'i');
	var card = getParam(html, null, null, re);
	if(!card)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.num ? 'карту с псевдонимом ' + prefs.num : 'ни одной карты'));

	getParam(card, result, 'cardNumber', /CardNum[^>]*>([^<]+)/i);
	getParam(card, result, '__tariff', /CardNum[^>]*>([^<]+)/i);
	getParam(card, result, 'validto', /CARD_EXPIRE[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(card, result, 'balance', /AMOUNT_AVAILABLE[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['currency', 'balance'], /Currency[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	return result;
}

function fetchContract(prefs, result) {
	html = AnyBalance.requestPost(g_baseurl + 'GateWay&Target=Android', {Template: 'ContractList'}, addHeaders({Base64Fields: 'XML'}));
	
	var re = new RegExp('<Contract\\s+[^>]*>\\s*<Synonym>' + (prefs.num ? '<!\\[CDATA\\[' + prefs.num + '\\]\\]>' : '[^]+?') + '<\/Synonym>[^]*?<\/Contract>', 'i');
	var contract = getParam(html, null, null, re);
	if(!contract)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.num ? 'услугу с псевдонимом ' + prefs.num : 'ни одной услуги'));

	getParam(contract, result, 'cardNumber', /ContracNum[^>]*>([^<]+)/i);
	getParam(contract, result, '__tariff', /ContracNum[^>]*>([^<]+)/i);
	getParam(contract, result, 'validto', /FinishDate[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(contract, result, 'balance', /ContractRest[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(contract, result, ['currency', 'balance'], /CurrCode[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	return result;
}