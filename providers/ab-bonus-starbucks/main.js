/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://starbuckscard.ru/';
	AnyBalance.setDefaultCharset('UTF-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Account/LogOn', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'Account/LogOn', params, addHeaders({Referer: baseurl + 'Account/LogOn'}));

	if (!/not-me-link/i.test(html)) {
		var error = getElement(html, /<div[^>]+validation-summary-errors[^>]*>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'stars', /<div[^>]*bd-star-count[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /<span[^>]+dynamic-card-balance-value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Ваш уровень:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<ul[^>]+bd-customer-info[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('cardNumber')){
		html = AnyBalance.requestGet(baseurl + 'card/page/CardInformation', g_headers);
		var cardinfo = getElement(html, /<ul[^>]+my-card-container[^>]*>/i);

		sumParam(cardinfo, result, 'cardNumber', /<li[^>]+title="[^"]*?(\d+)\s*\|/ig, replaceTagsAndSpaces, null, aggregate_join);
	}

	AnyBalance.setResult(result);
}