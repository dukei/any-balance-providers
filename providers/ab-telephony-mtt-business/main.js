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
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}


	var result = {success: true};
	html = AnyBalance.requestGet(json.url);

//	if(AnyBalance.isAvailable('balance'
//	html = AnyBalance.requestGet(baseurl + 'default/getWidget?widgetName=statusesWidget', g_headers);

	getParam(html, result, 'accountID', /Лицевой счет:([\s\S]*?)(?:<\/a>|<\/div>)/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<div[^>]+balance-block[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'manager', /<span[^>]+class\s*=\s*"lR__question-manager"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('busyLK', 'freeLK', 'totalLK', 'lkCost')){
		html = AnyBalance.requestGet(baseurl + 'default/getWidget?customerLogin=' + encodeURIComponent(prefs.login) + '&widgetName=workPlaceWidget', g_headers);
		json = getJson(html);

		getParam(json.content, result, 'busyLK', /<[^>]+sub-data-engaged[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(json.content, result, 'freeLK', /<[^>]+sub-data-free[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(json.content, result, 'totalLK', /<[^>]+sub-data-total[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(json.content, result, 'lkCost', /Стоимость:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	}

	if(AnyBalance.isAvailable('cost')){
		html = AnyBalance.requestGet(baseurl + 'default/getWidget?widgetName=CustomerWidget', g_headers);
		json = getJson(html);
		getParam(json.content, result, 'cost', /Аб\.\s+пл\.:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}

	if(AnyBalance.isAvailable('totalDiskSpace', 'usedDiskSpace', 'freeDiskSpace', 'diskCost')){
		function parseTrafficMy(str) {
			return parseTraffic(str + 'Mb');
		}

		html = AnyBalance.requestGet(baseurl + 'default/getWidget?customerLogin=' + encodeURIComponent(prefs.login) + '&widgetName=diskSpaceWidget', g_headers);
		json = getJson(html);

		getParam(json.content, result, 'usedDiskSpace', /<[^>]+sub-data-engaged[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(json.content, result, 'freeDiskSpace', /<[^>]+sub-data-free[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(json.content, result, 'totalDiskSpace', /<[^>]+sub-data-total[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(json.content, result, 'diskCost', /Стоимость:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}