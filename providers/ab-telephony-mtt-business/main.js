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
	var baseurl = 'https://business.mtt.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'user/login/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function (params, str, name, value) {
		if (name == 'CustomerLoginForm[email]')
			return prefs.login;
		else if (name == 'CustomerLoginForm[password]')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'user/processLogin', params, addHeaders({
		Referer: baseurl + 'user/login'
	}));
	var json = getJson(html);

	if (!json.success) {
		var error = json.errors ? json.errors.CustomerLoginForm_password.join(' ,') : undefined;
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный email или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}


	var result = {success: true};
	html = AnyBalance.requestGet(json.url);
	getParam(html, result, 'accountID', /<div[^>]+class\s*=\s*"lR"(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<div[^>]+class\s*=\s*"lR"(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cost', /<div[^>]+class\s*=\s*"lR"(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'manager', /<span[^>]+class\s*=\s*"lR__question-manager"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(html, result, 'busyLK', /Личные кабинеты[\s\S]*?<div[^>]+class\s*=\s*"diagram__sub-data"(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'freeLK', /Личные кабинеты[\s\S]*?<div[^>]+class\s*=\s*"diagram__sub-data"(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'totalLK', /Личные кабинеты[\s\S]*?<div[^>]+class\s*=\s*"diagram__sub-data"(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lkCost', /Личные кабинеты[\s\S]*?<div[^>]+class\s*=\s*"diagram__sub-data"(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	var units = 'Mb';

	function parseTrafficMy(str) {
		return parseTraffic(str + units);
	}

	getParam(html, result, 'totalDiskSpace', /Дисковое пространство[\s\S]*?всего([^>]*>){2}/i, replaceTagsAndSpaces, parseTrafficMy);
	getParam(html, result, 'usedDiskSpace', /Дисковое пространство[\s\S]*?занято([^>]*>){2}/i, replaceTagsAndSpaces, parseTrafficMy);
	getParam(html, result, 'freeDiskSpace', /Дисковое пространство[\s\S]*?свободно([^>]*>){2}/i, replaceTagsAndSpaces, parseTrafficMy);
	getParam(html, result, 'diskCost', /Дисковое пространство[\s\S]*?<div[^>]+class\s*=\s*"diagram__data"(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}