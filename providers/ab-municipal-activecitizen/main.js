
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
	var baseurl = 'https://ag.mos.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	var phone = getParam(prefs.phone || '', null, null, /^\d{10}$/i, [/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4']);
	checkEmpty(phone, 'Введите номер телефона, 10 цифр подряд!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/site/index', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var token = getParam(html, null, null, /<input[^>]*value="([^"]*)"[^>]*name="[^"]*Token[^"]*"[^>]*>/i);

	html = AnyBalance.requestPost(baseurl + 'user/login', {
		'YII_CSRF_TOKEN': token,
		'LoginForm[username]': phone,
		'LoginForm[password]': prefs.password,
		'LoginForm[verifyCode]': '',
		"LoginForm[offer]": "true",
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Origin: 'https://ag.mos.ru',
		Referer: baseurl
	}));

	var json = getJson(html);

	if (!json.redirect) {
		var
			error,
			errorrsArr = [];
		for (var key in json) {
			errorrsArr.push(json[key]);
		}

		error = errorrsArr.join(', ');

		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl);

	var result = {
		success: true
	};

	getParam(html, result, 'points', /"current_points"[^>]*>\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
