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
	var baseurl = 'http://core.baltictv.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ca_login.php?lng=ru', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'ca_login.php', params, addHeaders({Referer: baseurl + 'ca_login.php?lng=ru'}));
	
	if (!/>выйти</i.test(html)) {
		var error = getParam(html, null, null, /raise_error\(["']([^"']+)["']/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Логин либо пароль ошибочны/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /В кошельке(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /В кошельке(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'status', /Статус(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'id', /ID:([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['days'])) {
		html = AnyBalance.requestGet(baseurl + 'ca_sub.php', g_headers);
		
		var subs = sumParam(html, null, null, /<tr>\s*<td[^>]*>\d+<\/td>(?:[^>]*>){11}активна(?:[^>]*>){5}\s*<\/tr>/ig);
		AnyBalance.trace('Найдено активных подписок: ' + subs.length);
		
		sumParam(html, result, 'days', /(\d+)(?:[^>]*>){4}активна(?:[^>]*>){5}\s*<\/tr>/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);
		// Оставим для нескольких подписок
		/*for(var i = 0; i < subs.length; i++) {
			getParam(html, result, 'days', /([^>]*>){11}/i, replaceTagsAndSpaces, parseBalance);
		}*/
	}
	
	AnyBalance.setResult(result);
}