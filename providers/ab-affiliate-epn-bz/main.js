
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://epn.bz/ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'auth/login', {
    username: prefs.login,
    password: prefs.password,
	}, addHeaders({
		Referer: baseurl + 'auth/login'
	}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div class="md-alert red"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неправильная пара/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

  if(isAvailable(['balance', 'balance_hold'])) {
    html = AnyBalance.requestGet(baseurl + 'profile/get-balance', addHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      Referer: baseurl + 'cabinet/'
    }));

    var json = getJson(html);
    getParam(json.balance + '',      result, 'balance',      null, null, parseBalance);
    getParam(json.balance_hold + '', result, 'balance_hold', null, null, parseBalance);

  }

	AnyBalance.setResult(result);
}
