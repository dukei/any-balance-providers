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
	var baseurl = 'http://office.elektro-32.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl + 'Default.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'txtLogin')
			return prefs.login;
		else if (name == 'txtPassword')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'Default.aspx', params, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выйти' проверяем залогинились или нет
	var exitLink = getElementById(html, 'ctl00_btExit', replaceTagsAndSpaces);
	if (!/Выход/i.test(exitLink)) {
		// определяем ошибку
		var error = getElementById(html, 'lbError', replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Нет такого пользователя или пароль неверен/i.test(error));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}

	/* Получаем данные */

	var html = AnyBalance.requestPost(baseurl + 'Cabinet.aspx', {
		ctl00$MainPlaceHolder$ddGod: (new Date()).getFullYear()
	}, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при получении данных! Попробуйте позже.');
	}

	var result = {success: true};

	getParam(html, result, 'fio', /Здравствуйте[\s\S]*?<b[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);

	var table = getElementById(html, 'ctl00_MainPlaceHolder_tableLic');
	if (table) {
		getParam(table, result, 'licschet', /<table[\s\S]*?<tr[^>]*?Button[^>]*?>\s*?<td[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
		getParam(table, result, 'balance', /на\s*?сумму[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
		getParam(table, result, 'last_month', /Квитанция\s*?за[\s\S]*?<b[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseDateWord);
	} else {
		// если не смогли найти данные
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу с начислениями. Сайт изменен?');
	}

	AnyBalance.setResult(result);
}
