
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
	var baseurl = 'https://brusnichka.com.ua/pokupatelyam/freshcard/';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '', {
		login: prefs.login,
		password: prefs.password,
		action: 'Authenticate'
	}, AB.addHeaders({
		Referer: baseurl + ''
	}));

	var error = AB.getParam(html, null, null, /error[^"]*"[^>]*>([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
	if (error) {
		throw new AnyBalance.Error(error, null, /найден|пароль/i.test(error));
	}

	// html = AnyBalance.requestGet(baseurl + '', g_headers);
	AnyBalance.sleep(3000);
	html = AnyBalance.requestGet(baseurl + '', g_headers);
	// html = AnyBalance.requestGet(baseurl + 'pokupatelyam/freshcard/', g_headers);

	if (!/exit|выход|logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'card', /Карта[\s]*?<b>№([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'balance', /Активный баланс бонусов(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces,
		AB.parseBalance);

	AnyBalance.setResult(result);
}
