
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://deil-00.ru/';
	AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'cabinet/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'cab_login') {
			return prefs.login;
		} else if (name == 'password') {
			return '';
		}
		return value;
	});

	params.cab_hash = hex_md5(params.cab_random_word + prefs.password).toUpperCase();
	html = AnyBalance.requestPost(baseurl + 'cabinet/login', params, AB.addHeaders({
		Referer: baseurl + 'cabinet/'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="ideco_error"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Текущий баланс(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cost', /Абонентская плата(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'user', /пользователь(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', /телефон(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'ip', /IP:(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'agreement', /Договор(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /Тарифный план(?:[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
