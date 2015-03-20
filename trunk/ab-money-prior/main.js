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
	var baseurl = 'https://www.prior.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = login(prefs, baseurl);

	var result = {success: true};

	if(prefs.type == 'card')
		fetchCard(prefs, baseurl, result);
	else if(prefs.type == 'contract')
		fetchContract(prefs, baseurl, result);
	else
		fetchEldep(prefs, baseurl, result);
	
	AnyBalance.setResult(result);
}

function login(prefs, baseurl){
	var html = AnyBalance.requestGet(baseurl + 'r/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var captchaKey, captcha;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		captchaSrc = getParam(html, null, null, /"MainContent_loginForm_imgAntiRobot" src="([^"]+)/i);
		captcha = AnyBalance.requestGet(baseurl + 'r/' + captchaSrc);
		if(!captcha)
			throw new AnyBalance.Error('Не удалось получить капчу! Попробуйте обновить данные позже.');
		captchaKey = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaKey);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$MainContent$loginForm$tbName') 
			return prefs.login;
		else if (name == 'ctl00$MainContent$loginForm$tbPassword')
			return prefs.password;
		else if(name == 'ctl00$MainContent$loginForm$tbAntiRobotKeyword')
			return captchaKey;
		else if(name == '__EVENTTARGET')
			return 'ctl00$MainContent$loginForm$rbLogin';
		return value;
	});
	
	html = requestPostMultipart(baseurl + 'r/', params, addHeaders({Referer: baseurl + 'r/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="Error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function fetchCard(prefs, baseurl, result){
	var html = AnyBalance.requestGet(baseurl + 'r/retail/cards/', addHeaders({Referer: baseurl + 'r/retail/cards/'}));
	var row = getRow(html, prefs);

	getParam(row, result, '__tariff', /(?:<td[^>]*>[^]*?<\/td>){8}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(row, result, 'status', /(?:<td[^>]*>[^]*?<\/td>){13}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(row, result, 'expire', /(?:<td[^>]*>[^]*?<\/td>){14}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseDate);
	getParam(row, result, 'balance', /(?:<td[^>]*>[^]*?<\/td>){15}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(row, result, ['currency', 'balance'], /(?:<td[^>]*>[^]*?<\/td>){16}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
}

function fetchContract(prefs, baseurl, result){
	var html = AnyBalance.requestGet(baseurl + 'r/retail/contracts/', addHeaders({Referer: baseurl + 'r/retail/contracts/'}));
	var row = getRow(html, prefs);

	getParam(row, result, '__tariff', /(?:<td[^>]*>[^]*?<\/td>){6}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(row, result, 'accnum', /(?:<td[^>]*>[^]*?<\/td>){7}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(row, result, 'expire', /(?:<td[^>]*>[^]*?<\/td>){11}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseDate);
	getParam(row, result, 'balance', /(?:<td[^>]*>[^]*?<\/td>){12}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(row, result, ['currency', 'balance'], /(?:<td[^>]*>[^]*?<\/td>){13}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
}

function fetchEldep(prefs, baseurl, result){
	var html = AnyBalance.requestGet(baseurl + 'r/retail/eldeposits/', addHeaders({Referer: baseurl + 'r/retail/contracts/'}));
	var row = getRow(html, prefs);

	getParam(row, result, '__tariff', /(?:<td[^>]*>[^]*?<\/td>){6}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(row, result, 'accnum', /(?:<td[^>]*>[^]*?<\/td>){7}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(row, result, 'expire', /(?:<td[^>]*>[^]*?<\/td>){11}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseDate);
	getParam(row, result, 'balance', /(?:<td[^>]*>[^]*?<\/td>){12}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(row, result, ['currency', 'balance'], /(?:<td[^>]*>[^]*?<\/td>){13}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
}

function getRow(html, prefs){
	var table = getParam(html, null, null, /<table[^>]+class="MasterTable_Raiffeisen[^>]*>[^]*?<tbody>([^]+?)<\/tbody>/i);
	if(!table)
		throw new AnyBalance.Error('Не удалось найти таблицу с услугами. Сайт изменен?');
	var rows = sumParam(table, null, null, /<tr[^>]*>[^]+?<\/tr>/ig);
	if(!rows.length)
		throw new AnyBalance.Error('Не удалось найти ни одной услуги.');

	var row;
	if(prefs.num) {
		row = rows.filter(function(row){ return new RegExp(prefs.num, 'i').test(row); })[0];
		if(!row)
			throw new AnyBalance.Error('Не удалось найти услугу с псевдонимом ' + prefs.num);
	} else {
		row = rows[0];
	}

	return row;
}	