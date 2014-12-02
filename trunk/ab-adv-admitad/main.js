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
	var baseurl = 'https://www.admitad.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/sign_in/', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'ru/sign_in/', params, addHeaders({Referer: baseurl + 'ru/sign_in/'}));
	
	if (!/sign_out/i.test(html)) {
		var error = getParam(html, null, null, /"errorlist"[^>]*>([\s\S]*?)<\/ul/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /еправильный логин и\/или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'ru/webmaster/ajax/user_balance/', g_headers);
	
	var json = getJson(html);
	
	var result = {success: true};
	
	for(var i=0; i<json.mixed_balances.length; i++) {
		var current = json.mixed_balances[i];
		
		getParam(current.balance+'', result, 'out_' + current.currency.toLowerCase(), null, replaceTagsAndSpaces, parseBalance);
	}
	
	// getParam(html, result, 'in_process', />В обработке(?:[^>]*>){13}\s*<table>([\s\S]*?)<\/table/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'out_usd', />Готовы к снятию(?:[^>]*>){4}\s*USD([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'out_rub', />Готовы к снятию(?:[^>]*>){10}\s*RUB([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'out_rub', />Готовы к снятию(?:[^>]*>){10}\s*RUB([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}