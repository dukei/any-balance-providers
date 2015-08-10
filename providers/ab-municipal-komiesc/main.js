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
	var baseurl = 'https://cabinet.komiesc.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getParam(html, null, null, /user-login-form[^>]*>([^]*?)<\/form>/i);
	if(!form)
		throw new AnyBalance.Error('Не найдена форма входа. Сайт изменен.');
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'name') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'cabinet?destination=cabinet', params, addHeaders({Referer: baseurl + 'login'}));
	
	// Ошибка может быть в ЛК
	var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error, null, /Введенные Вами имя пользователя или пароль неверны/i.test(error));

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Состояние расчетов:[^>]*>\s*<div[^>]*>([^<]+)/i, [replaceTagsAndSpaces, 'долг', '-'], parseBalance);
	getParam(html, result, 'account', /Номер договора:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Адрес:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}