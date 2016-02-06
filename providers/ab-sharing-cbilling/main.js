
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
	var baseurl = 'https://cbilling.bz/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '?mode=auth', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var urlPart = AB.getParam(html, null, null, /libs\/securimage\/securimage_show[^"]*/i);
		var picture = AnyBalance.requestGet(baseurl + urlPart);
		var captchaValue;
		captchaValue = AnyBalance.retrieveCode("Пожалуйста, решите пример на картинке", picture);
		AnyBalance.trace('Капча получена: ' + captchaValue);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + '?mode=auth', {
		login: prefs.login,
		password: prefs.password,
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

		var error = AB.getParam(html, null, null, /MessageError["'][^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

		if (error) {
			throw new AnyBalance.Error(error, null, /Проверьте логин и пароль/i.test(error));
		}
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + '?mode=main', g_headers);

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Ваш баланс:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['currency', 'balance'], /Ваш баланс:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
	AB.getParam(html, result, '__tariff', /<fieldset[^>]*>[^>]*>Ваши пакеты(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\//i,
		AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'date', /<fieldset[^>]*>[^>]*>Ваши пакеты(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\//i,
		AB.replaceTagsAndSpaces, AB.parseDateISO);
	AB.getParam(html, result, 'server', /Ваш сервер:([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'days', /Осталось дней([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
