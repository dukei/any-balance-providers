/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://profile.onliner.by',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

var g_api_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Content-Type': 'application/json',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var apiurl = 'https://user.api.onliner.by/',
		baseurl = 'https://profile.onliner.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(apiurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var token = getParam(html, null, null, /MODELS\.onlinerLogin\.data\.token\('([\S]+)'\);/i);
	checkEmpty(token, "Не удалось найти токен. Сайт изменен?");

	var res = AnyBalance.requestPost(apiurl + 'login', JSON.stringify({
		login: prefs.login,
		password: prefs.password,
		token: token
	}), addHeaders(g_api_headers));
	
	var json = getJson(res);

	var errorPart, error = [];
	if(json.errors || !json.user){
		for(var i in json.errors){
			errorPart = json.errors[i];
			error.push(isArray(errorPart) ? errorPart.join('. ') : errorPart);
		}
		error = error.join('. ');
		if(error)
			throw new AnyBalance.Error(error, null, /Неверный ник или e-mail|Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(json.user.money, result, 'balance');
	getParam(json.user.nickname, result, 'nickname');

	if(isAvailable(['account', 'registerDate', 'city'])){
		html = AnyBalance.requestGet(baseurl, g_headers);

		getParam(html, result, 'account', /Учетная запись(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'registerDate', /Зарегистрирован(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'city', /Из города(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	}

	if(isAvailable('newMessages')){
		html = AnyBalance.requestGet(baseurl + 'sdapi/api/messages/unread/', g_headers);

		getParam(html, result, 'newMessages', /\d+/i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}