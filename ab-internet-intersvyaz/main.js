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
	var baseurl = 'https://lk.is74.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	AnyBalance.trace(html);
	
	var params = createFormParams(html);
	
	params.u = prefs.login;
	params.p = prefs.password;
	//AnyBalance.trace(JSON.stringify(params));
	
	if(!prefs.dbg) {
		html = AnyBalance.requestPost(baseurl + 'auth/login', params, addHeaders({Referer: baseurl + 'auth/login'}));
	} else {
		html = AnyBalance.requestGet('https://ooointersvyaz6.lk.is74.ru/balance', g_headers);
	}
	var lastUrl = AnyBalance.getLastUrl();
	AnyBalance.trace('Last url was: ' + lastUrl);
	
	var subDomain = getParam(lastUrl, null, null, /https:\/\/([^\.]*)\.lk/i);
	AnyBalance.trace('Sub domain is: ' + subDomain);
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="auth-error-summary"[^>]*>([\s\S]*)<\/ul/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balans', /Баланс на\s*(?:\d+\.){2}\d{4}(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuspr', /Ваш текущий бонус(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'econom', /Ваш текущий бонус(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Здравствуйте,(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('nls')) {
		html = AnyBalance.requestGet('https://' + subDomain + '.lk.is74.ru/profile', g_headers);
		getParam(html, result, 'nls', /Лицевой счет №:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
	AnyBalance.setResult(result);
}