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

var g_headers2 = {
	'Accept': '*/*',
	'Referer': 'https://online.openbank.ru/finances/index',
	'X-Requested-With': 'XMLHttpRequest',
};

function getToken(html) {
	return getParam(html, null, null, /name="__RequestVerificationToken"[^>]+value="([^"]+)/i);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.openbank.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'logon', g_headers);

	html = AnyBalance.requestPost(baseurl + 'logon', {
		'__RequestVerificationToken': getToken(html),
		UserName: prefs.login,
		Password: prefs.password,
		UserNameFromHidden: prefs.login,
		PasswordFromHidden: prefs.password,
		captcha: '',
		stat: '8095'
	}, addHeaders({Referer: baseurl + 'logon'}));
	
	if (!/exit_link|logoff/i.test(html)) {
		var error = sumParam(html, null, null, /"error"[^>]*>([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
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
	
	// Теперь получаем данные по картам.
	html = AnyBalance.requestPost(baseurl + 'finances/cardsgrid', {
		syncCount: 1,
		syncStarted: '01.01.1970 0:00', // Иначе сервер плюется 500 ошибкой, а актуальную дату лень ставить :)
	}, addHeaders(g_headers2));
	
	//<a\s+href="\/([^"]+)[^>]+title="\d{4}[\s*]+7584
	var reCard = new RegExp('<a\\s+href="/([^"]+)[^>]+title="\\d{4}[\\s*]+' + lastdigits, 'i');
	
	var extHref = getParam(html, null, null, reCard);
	if(!extHref)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами '+prefs.lastdigits : 'ни одной карты!'));

	html = AnyBalance.requestGet(baseurl + extHref, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /(\d{4}[*\s]+\d{4})/i, replaceTagsAndSpaces);
	getParam(result.__tariff, result, 'cardNumber');
	getParam(html, result, 'accNum', /Номер счета:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Доступно на(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Доступно на(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);	
	getParam(html, result, 'blocked_balance', /Заблокировано:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'limit', /Кредитный лимит:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус карты:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /class="user"(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	getParam(html, result, 'till', /Карта действительна до:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	// Название карты
	getParam(html, result, 'cardName', /\d{4}[*\s]+\d{4}[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl) {
	throw new AnyBalance.Error("Отображение информации по счетам пока не поддерживается, свяжитесь с разработчиком для исправления ситуации.");
	
	var prefs = AnyBalance.getPreferences();
	var countLeft = prefs.lastdigits && (20 - prefs.lastdigits.length);
	var lastdigits = prefs.lastdigits ? (countLeft >= 0 ? '\\d{' + countLeft + '}' + prefs.lastdigits : prefs.lastdigits) : '\\d{20}';
	var re = new RegExp('Мои счета и вклады[\\s\\S]*?(<tr[^>]*>(?:[\\s\\S](?!</tr>))*>\\s*' + lastdigits + '\\s*<[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if (!tr) {
		if (prefs.lastdigits) throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по счету с последними цифрами " + prefs.lastdigits);
		else throw new AnyBalance.Error("Не удаётся найти ни одного счета");
	}
	var result = {
		success: true
	};
	getParam(tr, result, 'cardNumber', /(\d{20})/);
	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<div)/i, replaceTagsAndSpaces);
	fetchOldThanks(html, result);
	var cardref = getParam(tr, null, null, /<a[^>]+href="([^"]*)/i, null, html_entity_decode);
	if (AnyBalance.isAvailable('userName')) {
		html = AnyBalance.requestGet('https://esk.zubsb.ru/pay/sbrf/AccountsMain' + cardref);
		getParam(html, result, 'userName', /Владелец(?:&nbsp;|\s+)счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	}
	AnyBalance.setResult(result);
}

/** Приводим все к единому виду вместо ИВаНов пишем Иванов */
function capitalFirstLenttersDecode(str) {
	str = html_entity_decode(str + '');
	var wordSplit = str.toLowerCase().split(' ');
	var wordCapital = '';
	for (i = 0; i < wordSplit.length; i++) {
		wordCapital += wordSplit[i].substring(0, 1).toUpperCase() + wordSplit[i].substring(1) + ' ';
	}
	return wordCapital.replace(/^\s+|\s+$/g, '');;
}