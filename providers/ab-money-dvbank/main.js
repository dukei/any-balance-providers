/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ifobs.dvbank.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'ifobsClientDVBank/login.jsp?rnd=' + Math.random(), g_headers);

	// Пароль шифруется
	var pass = hex_md5(prefs.password);
	
	var htmlLogin = AnyBalance.requestPost(baseurl + 'ifobsClientDVBank/loginlite.jsp', {
		'sms': '',
		user: prefs.login,
		psw: ':**********',
		md5psw: pass
	}, addHeaders({Referer: baseurl + 'ifobsClientDVBank/login.jsp'}));

	html = AnyBalance.requestGet(baseurl + 'ifobsClientDVBank/nattempl/main/cardsaccounts.jsp', g_headers);
	
	if (!/Карткові рахунки|Карточные счета|Card accounts/i.test(html)) {
		var error = getParam(htmlLogin, null, null, /"createmenu"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	if(prefs.type == 'acc')
        fetchAcc(html, baseurl);
	// По умолчанию карта
    else
        fetchCard(html, baseurl);
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	
	// <td[^>]*goToDetails\('(\d+)[^>]*>\s*\d{4}\s\d{2}[*\s]+9256\s*<
	var reCard = new RegExp("<td[^>]*goToDetails\\('(\\d+)[^>]*>\\s*\\d{4}\\s\\d{2}[*\\s]+" + lastdigits+"\\s*<", 'i');
	
	var card = getParam(html, null, null, reCard);
	if(!card)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами '+prefs.lastdigits : 'ни одной карты!'));

	// Получили детальную инфу по карте
	html = AnyBalance.requestGet(baseurl + 'ifobsClientDVBank/natcardsdetails.action?typeToReturn=&cardno=' + card, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /(\d{4}\s*(?:[\d*]*\s)+\d{4})/i, replaceTagsAndSpaces);
	getParam(result.__tariff, result, 'cardNumber');
	getParam(html, result, 'balance', /<input[^>]+balance[^>]+value="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	// Поправить для инглиша и уа
	getParam(html, result, ['currency', 'balance'], /(?:Валюта счета|Валюта рахунку|Account currency)[\s\S]*?<input[^>]+value="([^"]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'acc_num', /(?:Номер счета|Номер рахунку|Account number)[\s\S]*?<input[^>]+value="([^"]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'cardName', /(?:Владелец|Власник|Owner)[\s\S]*?<input[^>]+value="([^"]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /(?:Состояние карты|Стан карти|Card state)[\s\S]*?<input[^>]+value="([^"]+)/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl) {
	throw new AnyBalance.Error("Отображение информации по счетам пока не поддерживается, свяжитесь с разработчиком для исправления ситуации.");
}