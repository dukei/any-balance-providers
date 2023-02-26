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
	var baseurl = 'https://my.datagroup.ua/';
	
	//AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setDefaultCharset('windows-1251');	
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl +'kiev/uk/signin', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var form = AB.getElement(html, /<form[^>]+authenticationForm[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'username') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		} else if (name == '_spring_security_remember_me') {
			return 'on';
		}
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'kiev/uk/signin', params, AB.addHeaders({
		Accept: 'application/json, text/plain, */*',
		Referer: 'https://my.datagroup.ua/kiev/uk/signin'
	}));
		

	if (!/signout/i.test(html)) {
		var error = getParam(html, null, null, /signInPage_error errorMessage[\s\S]*?[display\:\snone]{0}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильно введен логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
		
    
	var result = {success: true};
		
	getParam(html, result, 'balance', /currentBalance__value[\s\S]*?([\d\.\,\+\-]*)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /header__username[\s\S]*?<span>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'lic_account', /header__username__act[\s\S]*?(\d+)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'connection', /packageDescription[\s\S]*?<div[\s\S]*?<div>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /packageDescription[\s\S]*?<div[\s\S]*?<span>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Тариф:[\s\S]*?<span>([^<]+)</i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}
