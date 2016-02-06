
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
	var baseurl = 'http://www.lcom.net.ua/';
	var authUrl = 'http://stats.lcom.net.ua:60001/';
	AnyBalance.setDefaultCharset('koi8-r');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.setAuthentication(prefs.login, prefs.password);

	html = AnyBalance.requestGet(authUrl + 'info_client.php?step_1+uuuu2099', g_headers);

	if (AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Проверьте правильность ввода логина и пароля', null, true);
	}

	if (!/додаток/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /депозит\s+на(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i,
		AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['currency', 'balance'], /депозит\s+на(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i,
		AB.replaceTagsAndSpaces, AB.parseCurrency);
	AB.getParam(html, result, 'fio', /контактное\s+лицо[\s\S]*?(<td[^>]*>[\s\S]*?<\/td>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /тарифный\s+план[\s\S]*?(<td[^>]*>[\s\S]*?<\/td>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'id', /лицевой\s+сч[её]т[\s\S]*?(<td[^>]*>[\s\S]*?<\/td>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'access', /блокировании\s+доступа[\s\S]*?(<td[^>]*>[\s\S]*?<\/td>)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
