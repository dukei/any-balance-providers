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
	var baseurl = 'http://erkc-sch.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите Имя пользователя!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'modules/alcom_konsalt', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'name') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'modules/alcom_konsalt?destination=modules/alcom_konsalt', params, addHeaders({Referer: baseurl + 'modules/alcom_konsalt'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Сообщение об ошибке\s*<\/h2>([^(<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Логин или пароль введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var balance = getParam(html, null, null, /Начисления\s*<\/strong>(?:[^>]*>){5}[^>]*value=([-\d\s,."]+)/i, replaceTagsAndSpaces, parseBalance);
	var comission = getParam(html, null, null, /Начисления\s*<\/strong>(?:[^>]*>){26}\*?Комиссия[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(balance-comission, result, 'balance');
	
	AnyBalance.setResult(result);
}