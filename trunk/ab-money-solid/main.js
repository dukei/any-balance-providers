/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.e-life.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(prefs.num && !/\d{4}/.test(prefs.num))
		throw new AnyBalance.Error('Необходимо ввести последние 4 цифры номера карты, по которой вы хотите получить данные, либо оставить это поле пустым');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var now = new Date();
	html = AnyBalance.requestPost(baseurl, {
		action: 'Next',
		localDateTime: ([now.getDate(), now.getMonth() + 1, now.getFullYear()].join('/') + ' ' + [now.getHours(), now.getMinutes(), now.getSeconds()].join(':')),
		Login: prefs.login,
		Password: prefs.password
	}, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': baseurl
	}));

	if(!/Quit/i.test(html)) {
		checkErrors(html);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	fetchCard(html, baseurl, prefs);
}

function fetchCard(html, baseurl, prefs){
	var cardRegexp = prefs.num ? '?' + prefs.num : '',
		cardInfo = getParam(html, null, null, new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?<td[^>]*>[\\d*]*' + cardRegexp + '<\\/td>*?[\\s\\S]*?<\\/tr>)', 'i')),
		result = {success: true};

	if(!cardInfo) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.num ? 'карту с последними цифрами ' + prefs.num : 'ни одной карты!'));
	}

	getParam(cardInfo, result, 'balance', /(?:\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>){3}(\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(cardInfo, result, ['currency', 'balance'], /(?:\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>){3}(\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(cardInfo, result, 'end_date', /(?:\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>){2}(\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>)/i, replaceTagsAndSpaces, parseDate);
	getParam(cardInfo, result, 'cardnum', /(?:\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>){1}(\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(cardInfo, result, 'cardname', /(\s*<td[^>]*>(?:[\s\S](?!<\/td>))*[\s\S]<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function checkErrors(html){
	var error = getParam(html, null, null, /validation-summary-errors[^>]*>((?:[\s\S](?!<\/div>))*[\s\S])/i, replaceTagsAndSpaces, html_entity_decode),
		isFatal = /Логин не зарегистрирован в системе/i.test(error) || /Неверно введен пароль/i.test(error);

	if(error)
		throw new AnyBalance.Error(error, null, isFatal);
}