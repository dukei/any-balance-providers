
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://gorvodokanal.com/';
	AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'fdebts/login.php', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'fdebts/login.php', {
		kod: prefs.login,
		pass: prefs.password,
	}, AB.addHeaders({
		Referer: baseurl + 'fdebts/login.php'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /Вход в систему[\s\S]*?<span[^>]+red[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Абонент не найден или пароль неверен/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance', /Долг на конец периода[\s\S]*?<span[^>]*>[\s\S]*?<\/span>/i, [/<span[^>]+color:red[^>]*>/i, '-'], AB.parseBalance);
	AB.getParam(html, result, 'fio', /Ф. И. О. абонента:([^<]*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /Адрес абонента:([^<]*)/i, AB.replaceTagsAndSpaces);
	AnyBalance.setResult(result);
}
