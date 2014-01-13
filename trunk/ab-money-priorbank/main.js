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
	
	if (prefs.type == 'acc') 
		fetchAcc(prefs);
	else 
		fetchCard(prefs);
}

function fetchCard(prefs) {
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");

	html = AnyBalance.requestPost(g_baseurl + 'GateWay&Target=Android', {Template: 'CardList'}, addHeaders({Base64Fields: 'XML'}));
	
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	
	// <Card\s+(?:[^>]*>){2,6}\s*<CardNum>\d+</CardNum(?:[^>]*>){30,50}</Card\s*>
	var re = new RegExp('<Card\\s+(?:[^>]*>){2,6}\\s*<CardNum>' + lastdigits + '</CardNum(?:[^>]*>){30,50}</Card\\s*>', 'i');
	var card = getParam(html, null, null, re);
	if(!card)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты'));

	var result = {success: true};
	
	getParam(card, result, 'cardNumber', /Description[^>]*>([^<]+)/i);
	getParam(card, result, '__tariff', /Description[^>]*>([^<]+)/i);
	getParam(card, result, 'validto', /CARD_EXPIRE[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(card, result, 'balance', /AMOUNT_AVAILABLE[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['currency', 'balance'], /Currency[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function fetchAcc(baseurl, result) {
	throw new AnyBalance.Error('Получение данных по счетам еще не поддерживается, свяжитесь с автором провайдера!');
}