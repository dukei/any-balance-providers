/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://biling.sat-infa.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'login.php', {
		'field_login': prefs.login,
		'field_password': prefs.password,
		'submit_login': ''
	}, addHeaders({Referer: baseurl + 'login.php'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /(?:(?:"|')msg-error(?:"|')>)([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'index.php?mode=idx', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode, parseBalance);
	getParam(html, result, 'account', /Здравствуйте,([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'server_address', /сервер:([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'subscription', /активные подписки:(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'subscription_deadline', /активные подписки:(?:[^>]*>){8}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}