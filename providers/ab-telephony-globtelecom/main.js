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
	var baseurl = 'https://login.globtelecom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'user') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login.php', params, addHeaders({Referer: baseurl + 'login.php'}));
	
	if (!/do=logout/i.test(html)) {
		var error = getParam(html, null, null, /<font[^>]*color=["']red['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
		console.log(error);
		if (error)
			throw new AnyBalance.Error(error, null, /Введенные логин и\/или пароль не опознаны/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /files\/images\/balans.png(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус:([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<td width="237">([\s\S]*?)</i, replaceTagsAndSpaces);
	
	html = AnyBalance.requestGet(baseurl + 'tariff.php?st=Россия', g_headers);
	
	getParam(html, result, '__tariff', /Ваш тарифный план:([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}