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
	var baseurl = 'https://advertur.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getParam(html, null, null, /<form[^>]+action="[^"]*login"[\s\S]*?<\/form>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'email') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<span[^>]*>Баланс[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'payout', /Ближайшая выплата:([^<]*)/i, replaceTagsAndSpaces, parseDateWord);

	html = AnyBalance.requestGet(baseurl + 'payments', g_headers);

	var table = getElement(html, /<table[^>]+id="payments_table"[^>]*>/i);
	if(table)
		table = getElement(table, /<tbody[^>]*>/i);

	if(table){
		getParam(table, result, 'lastpaydate', /<td[^>]+data-sort-text="([^"]*)/i, replaceTagsAndSpaces, function (str) { return parseBalance(str)*1000 });
		getParam(table, result, 'lastpay', /(?:[\s\S]*?<td){3}[^>]+data-sort-text="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
		sumParam(table, result, 'lastpayto', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		sumParam(table, result, 'lastpayto', /(?:[\s\S]*?<td[^>]*>){2}[\s\S]*?<i[^>]+title="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	}
	
	AnyBalance.setResult(result);
}