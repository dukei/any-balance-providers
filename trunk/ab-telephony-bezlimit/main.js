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
	var baseurl = 'http://my.bezlimit.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php?r=user/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'index.php?r=user/login', {
		'UserLogin[username]': prefs.login,
		'UserLogin[password]': prefs.password
	}, addHeaders({Referer: baseurl + 'index.php?r=user/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /(?:errorSummary[\s\S]*?)<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не зарегистрирован/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Выйти[\s]\(([^)]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тариф([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус блок.([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone_bezlimit', /Номер SIM-карты в Безлимите([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}