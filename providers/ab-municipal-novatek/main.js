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
	var baseurl = 'https://www.gazchel.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите номер лицевого счета!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'AUTH_USER')
			return prefs.login;
		else if (name == 'AUTH_PW')
			return prefs.password;
		return value;
	});

	// почему-то этот параметр отсутствует
	if (!params['AUTH_USER']) {
		params['AUTH_USER'] = prefs.login;
	}

	// поле для поиска удаляем
	delete params.q_4;

	html = AnyBalance.requestPost(baseurl + 'netcat/modules/auth/', params, addHeaders({
		Host: 'www.gazchel.ru',
		Origin: baseurl,
		Referer: baseurl + 'netcat/modules/auth/'
	}));

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выйти' проверяем залогинились или нет
	var exitLink = getParam(html, null, null, /div[^>]*?warning[\s\S]*?<a[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	if (!/Выйти/i.test(exitLink)) {
		// определяем ошибку
		var error = getParam(html, null, null, /div[^>]*?id\s*?=\s*?['"]result_srok[\s\S]*?<p[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}

	/* Получаем данные */

	var result = {success: true};

	// логин и "Номер лицевого счета" это одно и то же
	result.licschet = prefs.login;

	getParam(html, result, 'fio', /Добро\s*?пожаловать[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Итого\s*?к\s*?оплате[\s\S]*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);

	if (AnyBalance.isAvailable('lastcounter')) {
		var html = AnyBalance.requestGet(baseurl + 'ajax/get_count.php' + '?id=' + result.licschet, g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при получении показания счетчика! Попробуйте обновить данные позже.');
		}

		if (/Нет данных/i.test(html)) {
			result.lastcounter = "Нет данных";
		} else {
			// показания счетчика находятся в последней ячейке таблицы
			getParam(html, result, 'lastcounter', /<\/td[^>]*?>\s*?<td[^>]*?>(.*?)<\/td[^>]*?>\s*?<\/tr[^>]*?>\s*?<\/table/i, replaceTagsAndSpaces, parseBalance);
		}
	}

	AnyBalance.setResult(result);
}
