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
	var baseurl = 'http://ag-sv.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'session[login]')
			return prefs.login;
		else if (name == 'session[password]')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'session', params, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выход' проверяем залогинились или нет
	var exitLinks = getElementsByClassName(html, 'header-menu list-inline', replaceTagsAndSpaces);
	if (!exitLinks || !exitLinks.length || !/Выход/i.test(exitLinks[0])) {
		// определяем ошибку
		var error = getElementsByClassName(html, 'help-block', replaceTagsAndSpaces);
		if (error && error.length) {
			throw new AnyBalance.Error(error[0], null, /Неверный номер телефона или пароль/i.test(error[0]));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}

	/* Получаем данные */

	var result = {success: true};

	getParam(html, result, 'phone', /Ваш\s*?номер[\s\S]*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'tariff', /Ваш\s*?тариф[\s\S]*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Статус[\s\S]*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'payment_system', /Система\s*?оплаты[\s\S]*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Баланс[\s\S]*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'subscr_fee', /Абон[\s\S]*?плата[\s\S]*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'costs', /Итого[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td[^>]*?>\s*?<\/tr[^>]*?>\s*?<\/tbody/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'date_costs', /Расходы\s*?на\s*?момент([\s\S]*?)</i, replaceTagsAndSpaces, parseDate);

	AnyBalance.setResult(result);
}
