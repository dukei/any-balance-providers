
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
	var baseurl = 'http://rainbow.evos.in.ua/ru-RU/6762a990-cd54-4186-89a6-4f7c124a14ba/0/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'Account/LogOn', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'Account/LogOn', {
		'Login': prefs.login,
		'Password': prefs.password,
		'RememberMe': false
	}, AB.addHeaders({
		Referer: baseurl + 'Account/LogOn'
	}));

	if (!/Привет|выйти/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]*class="[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'bonus', /Бонусов[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'name', /привет[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, AB.replaceTagsAndSpaces);

	if (AnyBalance.isAvailable('balance', 'orders', 'phone', 'discount', 'adress')) {
		html = AnyBalance.requestGet(baseurl + 'ClientProfile', g_headers);
		AB.getParam(html, result, 'balance', /Баланс[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'orders', /заказов[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'discount', /скидка[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'adress', /адрес[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'phone', /телефон[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	}

	AnyBalance.setResult(result);
}
