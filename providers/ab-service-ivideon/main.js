
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
	'Cache-Control': 'max-age=0',
	Origin: 'https://ru.ivideon.com',
	'Upgrade-Insecure-Requests': '1'
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

	var form = getElement(html, /<form[^>]+login-form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name)) {
			return prefs.login;
		} else if (/password/i.test(name)) {
			return prefs.password;
		}

		return value;
	});

	AnyBalance.setCookie('ru.ivideon.com', 'ivideon-preferredCdn', 'https://static.iv-cdn.com');

	html = AnyBalance.requestPost(baseurl + 'my/service/login', params, addHeaders({
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

			AB.getParam(html, result, 'balance', /<span[^>]+iv-balance__value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(html, result, ['currency', 'balance'], /<span[^>]+iv-balance__value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseCurrency);

		} catch (e) {
			AnyBalance.trace('Не удалось получить данные по балансам ' + e);
		}
	}

	AnyBalance.setResult(result);
}
