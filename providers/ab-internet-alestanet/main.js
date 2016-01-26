
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
интернет-провайдер ООО 'Алеста' в г. Красноярске и пригороде
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
	var baseurl = 'http://cabinet.alestanet.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '', {
		'login': prefs.login,
		'password': prefs.password
	}, AB.addHeaders({
		Referer: baseurl + ''
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /личный\s+кабинет[^<]*<\/div>([\s\S]*?)<form/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /пароль/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /лицевой\s+сч[её]т\s*<\/td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'credit', /кредит\s*<\/td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'fio', /ФИО\s*<\/td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

	if (AnyBalance.isAvailable('__tariff', 'nextTariff')) {
		html = AnyBalance.requestGet(baseurl + '?module=40_tariffs', g_headers);
		AB.getParam(html, result, '__tariff', /изменить\s*<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'nextTariff', /изменить\s*[\s\S]*?(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	}
	AnyBalance.setResult(result);
}
