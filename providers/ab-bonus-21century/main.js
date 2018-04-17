
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://www.21vek.by/";
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'users/login/', {
		'data[User][email]': 	prefs.login,
		'data[User][password]': prefs.password
	}, AB.addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl
	}));

	var json = AB.getJson(html);

	if (!json.user) {
		var error = json.error ? json.error : '';
		if (error) {
			throw new AnyBalance.Error(error, null, /пароль/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	html = AnyBalance.requestGet(baseurl + 'profile/cards/', g_headers);

	AB.getParam(html, result, 'balance', 		 /<span[^>]*class="[^"]*item__balance__value[^"]*"[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'discount', 		 /<div[^>]*class="[^"]*item__discount__inner[^"]*"[^>]*>([^<]*<){1}/i, 		  AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'purchase_amount', /<div[^>]*class="[^"]*item__discount__inner[^"]*"[^>]*>([^<]*<){2}/i, 		  AB.replaceTagsAndSpaces, AB.parseBalance);


/*
    AB.getParam(json.number, result, '__tariff', null, AB.replaceTagsAndSpaces);
 	AB.getParam(json.msg, result, 'textInfo', null, AB.replaceTagsAndSpaces);
 	AB.getParam(json.header, result, 'cardNumber', null, AB.replaceTagsAndSpaces);
*/


	AnyBalance.setResult(result);
}
