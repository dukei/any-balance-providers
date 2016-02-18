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
	var baseurl = 'http://lk.megaseti.net/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl + 'index.php?r=site/login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'LoginForm[login]')
			return prefs.login;
		else if (name == 'LoginForm[password]')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', params, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выход' проверяем залогинились или нет
	var exitLink = getParam(html, null, null, /<a[^>]*?logout[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	if (!/Выход/i.test(exitLink)) {
		// определяем ошибку
		var error = getElementsByClassName(html, 'alert alert-block alert-error', replaceTagsAndSpaces);
		if (error.length) {
			// substring(1) - удаляет 'x' от кнопки закрытия сообщения
			throw new AnyBalance.Error(error[0].substring(1), null, /Неверное имя пользователя или пароль/i.test(error[0]));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}

	/* Получаем данные */

	html = AnyBalance.requestGet(baseurl + 'index.php?r=account/index', g_headers);

	var result = {success: true};

	getParam(html, result, 'name', /<span[^>]*?content-aside-name[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Тариф[\s\S]*?content-aside-login[\s\S]*?>([\s\S]*?)\s*?до/i, replaceTagsAndSpaces);

	var colsDef = {
		balance: {
			re: /Баланс/i
		},
		contract: {
			re: /Номер\s*?договора/i,
			result_func: null
		},
		code: {
			re: /Код\s*?оплаты/i,
			result_func: null
		}
	};

	var table = getElement(html, /<table[^>]*?panel-grid[^>]*?>/i);
	if (table) {
		var info = [];
		processTable(table, info, 'info.', colsDef);
		if (info.length) {
			result.balance = info[0].balance;
			result.code = info[0].code;
			result.contract = info[0].contract;
		}
	}

	AnyBalance.setResult(result);
}
