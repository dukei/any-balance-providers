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
	var baseurl = 'http://www.bashesk.ru/ex/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		var html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'USER_LOGIN') 
			return prefs.login;
		else if (name == 'USER_PASSWORD')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'auth/', params, addHeaders({Referer: baseurl + 'auth/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'private/', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Здравствуйте,([^>]+>){1}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Точка учета №([\s\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Точка учета №([\s\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Общая задолженность([^>]+>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'pokazaniya', /Показание прибора учета([^>]+>){6}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'perekrut', /Перекрут \(при наличии\)([^>]+>){4}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}