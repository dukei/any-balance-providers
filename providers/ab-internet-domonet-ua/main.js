
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
	var baseurl = "https://domonet.ua/";
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'autorization', g_headers);

	if (!/<div[^>]*class="[^"]*autorization[^"]*"[^>]*>/i.test(html)) {
		baseurl = baseurl + 'ru/';
	}

	AnyBalance.trace(AnyBalance.getLastUrl());

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'autorization', {
		"login": prefs.login,
		"pass": prefs.password,
	}, AB.addHeaders({
		Referer: baseurl + 'autorization'
	}));

	AnyBalance.trace(AnyBalance.getLastUrl());

	var error = AB.getParam(html, null, null, /<div[^>]*class="[^"]*autorization[^"]*"[^>]*>([\s\S]*?)<form/i, AB.replaceTagsAndSpaces);
	if (error) {
		throw new AnyBalance.Error(error, null, /пароль/i.test(error));
	}

	html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, '__tariff', /usertarif_main_part[\s\S]*?(<span[^>]*>[\s\S]*?)<\/span/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'balance', /deposit_info(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<b1/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, ['currency', 'balance'], /deposit_info(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<b1/i, AB.replaceTagsAndSpaces,
		AB.parseCurrency);
	AB.getParam(html, result, 'account', /deposit_info(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<b1/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'monthlyPayment', /deposit_info(?:[\s\S]*?<span[^>]*>){3}([\s\S]*?)<b1/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);

	AnyBalance.setResult(result);
}
