
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
	var baseurl = "https://bonus.21vek.by/";
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}


	var pass = '';
	var parts = /(\d{2})(\d{2})(\d{4})/i.exec(prefs.password);
	if (parts) {
		pass += parts[1] + ' . ' + parts[2] + ' . ' + parts[3];
	} else {
		throw new AnyBalance.Error(
			'Дату рождения не удалось преобразовать в нужный формат, введите дату рождения без пробелов и точек, например 15101988'
		);
	}

	prefs.password = pass;

	var authForm = AB.getElement(html, /<form[^>]*id="[^"]*Bonus[^"]*"[^>]*>/i);

	if (!authForm) {
		throw new AnyBalance.Error('Не удалось найти форму входа');
	}


	var params = AB.createFormParams(authForm, function(params, str, name, value) {
		if (name == 'data[number]') {
			return prefs.login;
		} else {
			if (name == 'data[birthday]') {
				return prefs.password;
			}
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'users/card/', params, AB.addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'users/card/'
	}));

	var json = AB.getJson(html);

	if (!json.birthday) {
		var header = AB.getParam(json.header, null, null, null, AB.replaceTagsAndSpaces);
		var msg = AB.getParam(json.msg, null, null, null, AB.replaceTagsAndSpaces);
		if (header) {
			throw new AnyBalance.Error(header + ' | ' + msg, null, /не\s+найден/i.test(header));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(json.balance, result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(json.unit, result, 'curr', null, AB.replaceTagsAndSpaces);
	AB.getParam(json.number, result, '__tariff', null, AB.replaceTagsAndSpaces);
	AB.getParam(json.discount, result, 'discount', null, AB.replaceTagsAndSpaces);
	AB.getParam(json.msg, result, 'textInfo', null, AB.replaceTagsAndSpaces);
	AB.getParam(json.header, result, 'cardNumber', null, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
