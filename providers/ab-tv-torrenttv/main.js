
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
torrent-tv
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
	var baseurl = 'http://torrent-tv.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (/banhammer\/pid/i.test(html)) {
		AnyBalance.trace('От нас тут защищаются, зачем?!');

		html = AnyBalance.requestGet(baseurl + 'banhammer/pid', addHeaders({
			'Accept': '/*',
			'Referer': baseurl + 'auth.php'
		}));

		var token = AnyBalance.getLastResponseHeader('X-BH-Token');
		if (!token) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
		}
		AnyBalance.setCookie('torrent-tv.ru', 'BHC', token);
		AnyBalance.trace('Успешно прошли защиту от роботов..');
	}

	html = AnyBalance.requestPost(baseurl + 'auth.php', {
		'backurl': '/index.php',
		email: prefs.login,
		password: prefs.password,
		enter: 'Войти'
	}, AB.addHeaders({
		Referer: baseurl + 'auth.php'
	}));

	if (!/exit\.php/i.test(html)) {
		var error = AB.getParam(html, null, null, /"alert\s+alert-error"(?:[^>]*>){4}([\s\S]*?)<\/div/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /пароль/i.test(error));
		}
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'c_iptv.php', AB.addHeaders({
		Referer: baseurl + 'c_iptv.php'
	}));

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Баланс\s+лицевого\s+счета:(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, 'deadline', /Текущая подписка:(?:[^>]*>){4}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces,
		AB.parseDate);

	AnyBalance.setResult(result);
}
