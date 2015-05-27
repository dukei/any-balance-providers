/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Origin': 'http://onlinegost56.ru',
	'Accept-Language': 'ru,en;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://onlinegost56.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'corp/login.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'corp/corp/login.php', {
		user: prefs.login,
		pass: prefs.password,
	}, addHeaders({Referer: baseurl + 'corp/login.php'}));
	
	var json = getJson(html);
	
	if (json.result != 'OK') {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'corp/main.php', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'corp/corp/request.php?action=options', null, addHeaders({
		Referer: baseurl + 'corp/main.php', 
		'X-Requested-With':'XMLHttpRequest',
		'Content-Type': null
	}));
	json = getJson(html);
	
	if(json.error)
		throw new AnyBalance.Error(json.error);
	
	var result = {success: true};
	
	getParam(json.result.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.result.info, result, '__tariff');
	
	AnyBalance.setResult(result);
}