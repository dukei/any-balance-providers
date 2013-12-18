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
	var baseurl = "https://ibank.sbrf.com.ua/";
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, "Пожалуйста, укажите логин для входа в Сбербанк-Онлайн!");
	checkEmpty(prefs.password, "Пожалуйста, укажите пароль для входа в Сбербанк-Онлайн!");
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего", null, true);

	var html = AnyBalance.requestGet(baseurl+'ifobsClientSBRF/LoginForm.action', g_headers);
	// Пароль шифруется
	var pass = hex_md5(prefs.password);
	
	html = AnyBalance.requestPost(baseurl + 'ifobsClientSBRF/Login.action', {
		'sms': '',
		user: prefs.login,
		psw: ':**********',
		md5psw: pass
	}, addHeaders({Referer: baseurl + 'login'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"message message-error"(?:[^>]*>){15}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	

	AnyBalance.trace("Успешно авторизовались.");
	
    if(prefs.type == 'acc')
        fetchAcc(html, baseurl);
	// По умолчанию карта
    else
        fetchCard(html, baseurl);
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

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '';
	
	var reCard = new RegExp('<table width="100%"[^>]+>\\s*<tbody>(?:[^>]*>){4}(?:[\\d\\s*]+)' + lastdigits+'[\\s\\S]*?</table>', 'i');
	
	var tr = getParam(html, null, null, reCard);
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами '+prefs.lastdigits : 'ни одной карты!'));

	var result = {success: true};
	
	getParam(tr, result, 'cardNumber', /(\d{4}\s*(?:[\d*]*\s)+\d{4})/i, replaceTagsAndSpaces);
	getParam(tr, result, 'userName', /"attribute-surname"[^>]*>([\s\S]*?)<\/span/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	getParam(tr, result, 'balance', /id="balance_\d+"[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /id="balance_\d+"[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseCurrency);
	getParam(tr, result, 'status', /"Текущий карточный счет"(?:[^>]*>){7}([^<]*)/i, replaceTagsAndSpaces);
	
	// Дополнительная инфа по картам.
	if (AnyBalance.isAvailable('till', 'cardName', '', '', '', '', '', '', '', '')) {
		//https://ibank.sbrf.com.ua/ifobsClientSBRF/BankingCardShow.action?accountid=1027820&cardid=52ec16d582d302adec054869fa0030ee
		var href = getParam(tr, null, null, /<a\s+href="([^"]*)/i);
		if(href) {
			html = AnyBalance.requestGet(baseurl + 'ifobsClientSBRF/' + href, g_headers);
			
			getParam(html, result, 'till', /Срок действия карты:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
			getParam(html, result, 'cardName', /Имя держателя карты:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
			getParam(html, result, 'accNum', /Номер счета:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
		} else {
			AnyBalance.trace('Не нашли ссылку на дополнительную информацию по картам, возможно, сайт изменился?');
		}
	}
	
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