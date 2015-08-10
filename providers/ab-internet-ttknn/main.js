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
	var baseurl = 'https://abonent.ttknn.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cab/?action=auth_form', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'cab/?action=auth_form', {
		login: prefs.login,
		pass: prefs.password
	}, addHeaders({Referer: baseurl + 'cab/?action=auth_form'}));
	
	if (!/logout/i.test(html)) {
		error = getParam(html, null, null, /Неправильный логин или пароль/i);
		if (error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:[^>]+>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<div[^>]+topmenu_container[^>]*>[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Номер л\/с:[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable(['trafIn', 'trafOut'])){
		html = AnyBalance.requestGet(baseurl + 'cab/?path=stats&action=traffic', g_headers);

		getParam(html, result, 'trafIn', /Итого:(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces, function(val){ return parseTrafficGb(val, 'Мб'); });
		getParam(html, result, 'trafOut', /Итого:(?:[^>]+>){4}([^<]+)/i, replaceTagsAndSpaces, function(val){ return parseTrafficGb(val, 'Мб'); });			
	}
	
	AnyBalance.setResult(result);
}