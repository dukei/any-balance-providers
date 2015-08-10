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

function main(){
	if(AnyBalance.getLevel() < 9) {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v9, пожалуйста, дождитесь выхода новой версии приложения!');
	}
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://m.okeycity.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'site/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var html = AnyBalance.requestPost(baseurl + 'site/login', {
		'LoginForm[redirect]':'',
		'LoginForm[login]': prefs.login,
		'LoginForm[password]': prefs.password,
		'LoginForm[rememberMe]':'0',
		'yt0':'Вход'
    }, addHeaders({Referer: baseurl + 'site/login'})); 
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"errorMessage">([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Некорректен логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Баланс:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Карта:([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /([^>]+)<a href[^>]*logout/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}