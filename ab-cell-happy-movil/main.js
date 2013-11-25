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
	var baseurl = 'https://www.happymovil.es/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter phone number!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + 'es/area-de-clientes-happy-movil', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'es/area-de-clientes-happy-movil?task=user.login', params, addHeaders({Referer: baseurl + 'es/area-de-clientes-happy-movil'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'es/mi-happy/mi-consumo/saldo-prepago', g_headers);
	
	getParam(html, result, '__tariff', /Producto:(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /El saldo(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}