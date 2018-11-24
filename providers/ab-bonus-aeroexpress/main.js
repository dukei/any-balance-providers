/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'keep-alive',
	Pragma: 'no-cache',
	'Cache-Control': 'no-cache',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	Origin: 'https://aeroexpress.ru',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://aeroexpress.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

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

	html = AnyBalance.requestPost(baseurl + '', params, addHeaders({
		Referer: AnyBalance.getLastUrl()
	}));

	// по наличию ссылки 'Выход' проверяем залогинились или нет
	if (!/mgnlLogout/i.test(html)) {
		// определяем ошибку
		var error = getElementById(html, 'order_date_error', replaceTagsAndSpaces);
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

	html = AnyBalance.requestPost(baseurl + 'ru/aero/profile.html?open=bonus', g_headers);

	var csrf = getParam(html, /csrfToken\s*=\s*"([^"]*)/i);
	var referer = AnyBalance.getLastUrl();

	if (AnyBalance.isAvailable('flights', 'username')) {
		html = AnyBalance.requestPost(baseurl + 'ap/site/accountInfo', JSON.stringify({
			csrfToken: csrf,
			lang: 'ru'
		}), addHeaders({
			Accept: 'application/json, text/javascript, */*; q=0.01',
			'X-Requested-With': 'XMLHttpRequest',
			Referer: AnyBalance.getLastUrl(),
			'Content-Type': 'application/json'
		}));

		var json = getJson(html);

		getParam(json.crmProfile.flightsPerYear, result, 'flights');
		getParam(json.crmProfile.salutation, result, 'username');
	}

	if (AnyBalance.isAvailable('balance')) {
		html = AnyBalance.requestPost(baseurl + 'ap/site/crmBalance', JSON.stringify({
			csrfToken: csrf,
			lang: 'ru'
		}), addHeaders({
			Accept: 'application/json, text/javascript, */*; q=0.01',
			'X-Requested-With': 'XMLHttpRequest',
			Referer: AnyBalance.getLastUrl(),
			'Content-Type': 'application/json'
		}));
		var json = getJson(html);
		getParam(json.activeBalance, result, 'balance');
	}

	AnyBalance.setResult(result);
}
