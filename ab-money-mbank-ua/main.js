/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mpay.mbank.kiev.ua/';
	var currency;
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введіть логін!');
	checkEmpty(prefs.password, 'Введіть пароль!');

	var html = AnyBalance.requestPost(baseurl + 'uk/security/logon', {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl + 'uk/security/logon'}));

	if (!/btn-logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="[^"]*alert[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Недійсний логін чи пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не вдалося зайти в інтернет-банкінг. Сайт змінено?');
	}

	var result = {success: true};

	getParam(html, result, '__tariff', /home.png" \/>\s*<\/span>\s*<span class=[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'messages', /messagesCount = ko.observable\({"count":([\s\S]*?)} .count\);/i, replaceTagsAndSpaces, html_entity_decode);
	var tabid = getParam(html, null, null, /window.__tab_id\s*=\s*['"]([^'"]*)/);
	if(!tabid)
		throw new AnyBalance.Error('Не удаётся найти секретный параметр для запроса баланса. Сайт изменен?');

	html = AnyBalance.requestGet(baseurl + 'uk/widgets/products/balance/data/'+ prefs.curn +'?_=' + new Date().getTime(), addHeaders({'X-Tab-Id': tabid, 'X-Requested-With':'XMLHttpRequest'}));
	var json = getJson(html);

	getParam(json.AccountsAvailableAmount/100, result, 'balance');
	getParam(json.AccountsAvailableAmountOwn/100, result, 'balance_my');
	getParam(json.DepositsBalanceAmount/100, result, 'balance_vklad');
	getParam(json.LoansBalanceAmount/100, result, 'balance_kred');

	if(prefs.curn == 'UAH') {
	  result.currency = '₴';
	}
	if(prefs.curn == 'USD') {
	  result.currency = '$';
	}
	if(prefs.curn == 'EUR') {
	  result.currency = '€';
	}
	if(prefs.curn == 'RUB') {
	  result.currency = '₽';
	}

	html = AnyBalance.requestGet(baseurl + '/uk/security/logout', g_headers);

	AnyBalance.setResult(result);
}