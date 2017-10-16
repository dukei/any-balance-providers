/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'keep-alive',
	Pragma: 'no-cache',
	'Cache-Control': 'no-cache',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://aeroexpress.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl + 'ru/aero/user/login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var form = getElement(html, /<form[^>]+loginForm/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	/* Пробуем залогиниться */
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'mgnlUserId')
			return prefs.login;
		else if (name == 'mgnlUserPSWD')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'ru/enter', params, addHeaders({
		Referer: AnyBalance.getLastUrl()
	}));

	if(AnyBalance.getLastStatusCode() == 404){
		//Тупые аэроэкспрессы не ставят иногда куку сессии и тогда тут будет 404, но уже поставится куки. Если так, надо попробовать ещё раз.
		AnyBalance.trace('404 на вход. Пробуем ещё раз, с кукой');
		html = AnyBalance.requestPost(baseurl + 'ru/enter', params, addHeaders({
			Referer: AnyBalance.getLastUrl()
		}));
	}

	if(!html || AnyBalance.getLastStatusCode() > 400){
		//Тупые аэроэкспрессы не ставят иногда куку сессии и тогда тут будет 404, но уже поставится куки. Если так, надо попробовать ещё раз.
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выход' проверяем залогинились или нет
	var exitLinks = getElementsByClassName(html, 'close', replaceTagsAndSpaces);
	if (!exitLinks || !exitLinks.length || !/Выход/i.test(exitLinks[0])) {
		// определяем ошибку
		var error = getElementById(html, 'page-intro', replaceTagsAndSpaces);
		if(!error)
			error = getElement(html, /<div[^>]+id="crmWarning"/i, replaceTagsAndSpaces);
		if (error) 
			throw new AnyBalance.Error(error, null, /парол/i.test(error));

		// если не смогли определить ошибку, то показываем дефолтное сообщение
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
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
