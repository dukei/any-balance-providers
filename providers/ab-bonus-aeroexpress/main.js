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
	var baseurl = 'https://aeroexpress.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'mgnlUserId')
			return prefs.login;
		else if (name == 'mgnlUserPSWD')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'ru/aero/user/login', params, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выход' проверяем залогинились или нет

	var exitLinks = getElementsByClassName(html, 'close', replaceTagsAndSpaces);
	if (!exitLinks || !exitLinks.length) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var exitLink = exitLinks[0];
	if (!/Выход/i.test(exitLink)) {
		// определяем ошибку
		var error = getElementById(html, 'page-intro', replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Вы неверно указали логин или пароль/i.test(error));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}

	/* Получаем данные */

	var result = {success: true};

	if (AnyBalance.isAvailable('flights', 'username')) {
		var info = createFormParams(html);
		result.flights = parseBalance(info.flightPerYear);
		result.username = info.salutation;
	}

	if (AnyBalance.isAvailable('balance')) {
		html = AnyBalance.requestPost(baseurl + 'ap/getCrmBalance', {
			login: prefs.login,
			password: prefs.password
		}, g_headers);
		var json = getJson(html);
		result.balance = parseBalance(json.activeBalance);
	}

	AnyBalance.setResult(result);
}
