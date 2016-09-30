
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.etm.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'cat/index.html', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'cat/data-login.html', {
		phone: 		prefs.login,
		pwd: 		prefs.password,
		'type': 	'login',
		'mode':		'recovery'
	}, AB.addHeaders({
		Referer: baseurl + 'cat/index.html',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var x_html = AnyBalance.requestGet(baseurl + 'cat/index.html', g_headers);

	if (!/logout/i.test(x_html)) {
		var json  = getJson(html),
			error = json[0].msg;
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'cat/discount-card.html', g_headers);

	AB.getParam(html, result, 'balance', /<table[^>]*>(?:[\s\S]*?<span[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'bonus',   /<table[^>]*>(?:[\s\S]*?<span[^>]*>){3}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'cardnum',   /<span[^>]+prop-name[^>]*>Дисконтная карта(?:[^>]*>){2}\s*(\d*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'level',     /<table[^>]*>(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, 				      AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'discount',  /<table[^>]*>(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, 				      AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff',  /<span[^>]+prop-name[^>]*>Дисконтная карта(?:[^>]*>){2}\s*(\d*)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
