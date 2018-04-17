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
	var baseurl = 'https://stat.ip-home.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'}));

	if(/Продолжить ВХОД/i.test(html))
		html = AnyBalance.requestGet(baseurl, addHeaders({Referer: baseurl + 'welcome'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /alert-danger[^>]*>{1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    var table = getParam(html, null, null, /Название тарифа\/услуги([\s\S]*?)<\/table/i);
    sumParam(table, result, '__tariff', /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, null, aggregate_join);    
    
	getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){ return Math.round(parseBalance(str)*100)/100 });
	getParam(html, result, 'limit', /Постоянный кредитный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Логин:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}