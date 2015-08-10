/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_api_key = 'c836133ed96c14be43c74b9bb5312b67';

function createGetParams(data) {
	var params = [];
	for (var name in data) {
		params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
	}
	// Заполняем параметры, которые есть всегда
	params.push(encodeURIComponent('api_key') + '=' + encodeURIComponent(g_api_key));
	
	return params.join('&');
}

var g_errors = {
	1:'Неправильный логин либо пароль.',
	2:'Аккаунт заблокирован на 10 минут за перебор паролей.'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.unet.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'api/login?' + createGetParams({login:prefs.login, pass:prefs.password}), g_headers);
	var session = getParam(html, null, null, /session="([^"]+)"/i);
	
	if (!session) {
		var error = getParam(html, null, null, /error="([^"]+)"/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(g_errors[error], null, /Неправильный логин либо пароль/i.test(g_errors[error]));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'api/info?' + createGetParams({sid:session}), g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /deposit="([^"]+)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /tariff="([^"]+)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'traf_inet', /count_internet="([^"]+)"/i, [replaceTagsAndSpaces, /(.+)/, '$1 mb'], parseTraffic);
	getParam(html, result, 'traf_unet', /count_unet="([^"]+)"/i, [replaceTagsAndSpaces, /(.+)/, '$1 mb'], parseTraffic);
	//getParam(html, result, 'accnum', /<td>\s*Номер счёта(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}