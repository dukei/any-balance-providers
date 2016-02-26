
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
	var baseurl = 'https://ru.ivideon.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'my/service/login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var token = getParam(html, null, null, /<input[^>]*value="([^"]*)"[^>]*name="[^"]*TOKEN[^"]*"/i);

	html = AnyBalance.requestPost(baseurl + 'my/service/login', {
		'IVIDEON_CSRF_TOKEN': token,
		'LoginForm[username]': prefs.login,
		'LoginForm[password]': prefs.password
	}, addHeaders({
		Referer: baseurl + 'my/service/login'
	}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*class="[^"]*errorSummary[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	if (AnyBalance.isAvailable('balance')) {
		try {
			html = AnyBalance.requestGet(baseurl + 'my/billing/fill', g_headers);

			AB.getParam(html, result, 'balance', /Состояние\s+сч[её]та([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(html, result, ['currency', 'balance'], /Состояние\s+сч[её]та([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseCurrency);

		} catch (e) {
			AnyBalance.trace('Не удалось получить данные по балансам ' + e);
		}
	}

	AnyBalance.setResult(result);
}
