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
	var baseurl = 'https://cp.sprinthost.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function (params, str, name, value) {
		if (name == 'username')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl, {
		action: 'login',
		username: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl}));

	var json = getJson(html);

	if (!json.status)
		throw new AnyBalance.Error("Неправильный логин или пароль.");
	else if (json.newip) {
		var error = getParam(json.content, null, null, null, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /подозрительного IP/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + 'CMD_LOGIN', params, addHeaders({Referer: baseurl}));
	var result = {success: true};

	var userinfo = getElement(html, /<div[^>]+id="user_info"[^>]*>/i);

	getParam(userinfo, result, 'balance', /Баланс(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseBalance);
	getParam(userinfo, result, '__tariff', /Тарифный план(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces);
	getParam(userinfo, result, 'tariffCost', /По тарифу(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseBalance);
	getParam(userinfo, result, 'dBonus', /Бонусов на домены(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseBalance);
	getParam(userinfo, result, 'bonus', /В т.ч. бонус(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseBalance);
	getParam(userinfo, result, 'daysLeft', /Осталось дней(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'accountID', /лицевой счет №(?:[\s\S]*?<strong[^>]*>){1}([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);

	getParam(html, result, 'diskSpaceUsed', /Диск, Мб[\s\S]*?<span[^>]+text-primary[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'totalDiskSpace', /Диск, Мб[\s\S]*?\/(\d+)/i, replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'FTPs', /Входов FTP[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'dataBases', /Баз данных[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'domains', /Доменов[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'vdomains', /Сайтов[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);

	if (isAvailable('fio'))
	{
		html = AnyBalance.requestGet(baseurl+'HTM_ACCOUNT_INFO', g_headers);
		getParam(html, result, 'fio', /Фамилия, имя, отчество(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces);
	}

	AnyBalance.setResult(result);
}