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
	var baseurl = 'https://online.pumb.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'Pages/Login/internet-banking-index_ua.aspx', g_headers);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'tbLogin') 
			return prefs.login;
		else if (name == 'tbPassword')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'Pages/Login/internet-banking-index_ua.aspx', params, addHeaders({Referer: baseurl + 'Pages/Login/internet-banking-index_ua.aspx'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"lblMessage"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	fetchAccount(html, baseurl);
}

function getStateParams(html, param) {
	return getParam(html, null, null, new RegExp(param + '[^>]*value="([^"]+)', 'i'));
}

function fetchAccount(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	
	//(<tr>\s+<td>\s+<a[^>]+__doPostBack[^>]*AccountDetails(?:[^>]*>){4}\s*\d{4}\s\d\s\d{5}8742[\s\S]*?</tr>)
	var reAcc = new RegExp("(<tr>\\s+<td>\\s+<a[^>]+__doPostBack[^>]*AccountDetails(?:[^>]*>){4}\\s*\\d{4}\\s\\d\\s\\d{5}" + lastdigits + '[\\s\\S]*?</tr>)', 'i');
	
	var tr = getParam(html, null, null, reAcc);
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'счет с последними цифрами '+prefs.lastdigits : 'ни одного счета!'));

	var result = {success: true};
	getParam(tr, result, 'accNum', /__doPostBack[^>]*AccountDetails(?:[^>]*>){4}\s*(\d{4}\s\d\s\d{9})/i, [/\D/g, ''/*, /(\d{4})[\d]*(\d{4})/i, '$1 **** **** $2'*/]);
	getParam(tr, result, '__tariff', /__doPostBack[^>]*AccountDetails(?:[^>]*>){4}\s*(\d{4}\s\d\s\d{9})/i, [/\D/g, '', /(\d{4})[\d]*(\d{4})/i, '$1 **** **** $2']);
	getParam(tr, result, 'balance', /__doPostBack[^>]*AccountHistory(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /__doPostBack[^>]*AccountHistory(?:[^>]*>){6}([^<]+)/i, replaceTagsAndSpaces);	
	
	if(isAvailable(['cardName', 'cardNumber', 'till', 'status', 'blocked_balance', 'fio'])) {
		var details = getParam(html, null, null, /__doPostBack[^']*'([^']*AccountDetails)/i);
		if(!details) {
			AnyBalance.trace('Не удалось найти ссылку на подробную информацию о счете, сайт изменен?');
		} else {
			html = AnyBalance.requestPost(baseurl + 'Pages/MainPage.aspx', {
				'__EVENTTARGET':details,
				'__EVENTARGUMENT':'',
				'__LASTFOCUS':'',
				'__VSTATE':getStateParams(html, '__VSTATE'),
				'__VIEWSTATE':'',
				'__VIEWSTATEENCRYPTED':'',
				'__PREVIOUSPAGE':getStateParams(html, '__PREVIOUSPAGE'),
				'__EVENTVALIDATION':getStateParams(html, '__EVENTVALIDATION'),
				'ctl00$ddlTheme':'Default'
			}, addHeaders({Referer: 'Pages/MainPage.aspx'}));

			// Название карты
			getParam(html, result, 'cardName', /imgCard"(?:[^>]+>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'cardNumber', /CardDetails(?:[^>]+>){1}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'till', /CardDetails(?:[^>]+>){6}([^<]+)/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'status', /CardDetails(?:[^>]+>){8}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'blocked_balance', /Блоковано(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'fio', /Клієнт:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
		}
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