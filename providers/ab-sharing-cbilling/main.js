var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cbilling.in/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '?mode=auth', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var urlPart = getParam(html, null, null, /libs\/securimage\/securimage_show[^"]*/i);
		var picture = AnyBalance.requestGet(baseurl + urlPart);
		var captchaValue;
		captchaValue = AnyBalance.retrieveCode("Пожалуйста, решите пример на картинке", picture);
		AnyBalance.trace('Капча получена: ' + captchaValue);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + '?mode=auth', {
		'login': prefs.login,
		'password': prefs.password,
		'code': captchaValue,
		'do': 'Войти',
	}, AB.addHeaders({
		Referer: baseurl + '?mode=auth'
	}));


	if (!/mode=logout/i.test(html)) {
		if (/Лицензионное соглашение/i.test(html)) {
			throw new AnyBalance.Error('Вам необходимо подтвердить лицензионное соглашение!');
		}

		if (/Проверьте ввод кода с картинки/i.test(html)) {
			throw new AnyBalance.Error('Вы ввели неверные символы с картинки!');
		}

		var error = AB.getParam(html, null, null, /MessageError["'][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

		if (error) {
			throw new AnyBalance.Error(error, null, /Проверьте логин и пароль/i.test(error));
		}
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + '?mode=main', g_headers);

	var result = {
		success: true
	};

	getParam(html, result, 'balance', 				/Баланс:([^<(]*)/i, 													  replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], 	/Баланс:([^<(]*)/i, 												  replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, '__tariff', 				/Ваши пакеты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, 				  replaceTagsAndSpaces);
	getParam(html, result, 'date', 					/Дата завершения(?:[\s\S]*?<div[^>]*>){3}([^<]*)/i, 					  replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'server', 				/Ваш сервер:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, 				      replaceTagsAndSpaces);
	getParam(html, result, 'days', 					/Осталось дней([\s\S]*?)<\//i, 											  replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}