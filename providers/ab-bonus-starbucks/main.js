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
	
	var html = AnyBalance.requestGet(baseurl + 'user/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+login-form/);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (/identity/i.test(name))
			return prefs.login;
		else if (/password/i.test(name))
			return prefs.password;
		return value;
	});

	html = requestPostMultipart(baseurl + 'user/login', params, addHeaders({Referer: baseurl + 'Account/LogOn'}));

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+error/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол|Логин/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'stars', /<span[^>]+class="stars"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /<span[^>]+class="balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Ваш уровень:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<!-- Guest Info -->[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('cardNumber')){
		html = AnyBalance.requestGet(baseurl + 'card/page/', g_headers);
		var cardinfo = getElement(html, /<div[^>]+card-head-menu/i);

		sumParam(cardinfo, result, 'cardNumber', /card\/view\/(\d+)/ig, replaceHtmlEntities, null, aggregate_join);
	}

	AnyBalance.setResult(result);
}