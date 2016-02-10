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
	var baseurl = 'http://tvin-telecom.ru/';
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

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'name')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'myaccount/', params, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выход' проверяем залогинились или нет
	var exitLink = getElement(html, /<a[^>]*?href\s*?=\s*?['"]\/logout\/['"][^>]*?>/i, replaceTagsAndSpaces);
	if (!/Выход/i.test(exitLink)) {
		// определяем ошибку
		var error = getElementById(html, 'main_text_retail', replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неправильная пара логин-пароль!/i.test(error));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}

	/* Получаем данные */

	var result = {success: true};

	getParam(html, result, 'balance', /Ваш[\s]*?баланс[\s]*?:[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Ваш[\s]*?баланс[\s]*?:[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'date', /Дата[\s\S]*?платы[\s]*?:([\s\S]*?)</i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'agreement', /Номер[\s]*?договора[\s]*?:([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /Адрес[\s]*?подключения[\s]*?:([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'tariff', /Тариф[\s]*?:([\s\S]*?)[*]*?</i, replaceTagsAndSpaces);
	getParam(html, result, 'phones', /телефоны[\s]*?:([\s\S]*?)</i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
