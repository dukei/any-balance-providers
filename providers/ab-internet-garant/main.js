
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
	var baseurl = 'https://garant-tv.by/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var captchaa;
	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + 'captcha/captcha.php?id=' + new Date().getTime());
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + 'balance/viewinfo.php', {
		userlogin: prefs.login,
		userpassword: prefs.password,
		captcha: captchaa,
		https: 'checked',
		Submit: 'Войти'
	}, AB.addHeaders({
		Referer: baseurl + 'balance/viewinfo.php'
	}));

	if (!/exit\.php/i.test(html)) {
		if (/error/i.test(AnyBalance.getLastUrl())) {
			throw new AnyBalance.Error('Неправильный логин или пароль', null, true);
		}
		// var error = AB.getParam(html, null, null, /<font color="red"[^>]*>([\s\S]*?)<\/div/i, AB.replaceTagsAndSpaces);
		// if (error) {
		// 	throw new AnyBalance.Error(error, null, /пароль/i.test(error));
		// }

		if (/errok/i.test(AnyBalance.getLastUrl())) {
			throw new AnyBalance.Error('Неверный код.');
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	getParam(html, result, 'balance', /Остаток на счету(?:[^>]*>){6}[^>]*value="([^"]*)/i, replaceTagsAndSpaces,
		parseBalance);
	getParam(html, result, 'acc_num', /Лицевой счет(?:[^>]*>){6}[^>]*value="([^"]*)/i, replaceTagsAndSpaces,
		html_entity_decode);
	getParam(html, result, 'fio', /Ф\.И\.О\.(?:[^>]*>){4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус(?:[^>]*>){4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план(?:[^>]*>){4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces,
		html_entity_decode);
	getParam(html, result, 'promised', /Обещанный платеж(?:[^>]*>){4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces,
		parseBalance);
	getParam(html, result, 'traffic', /Бонусный трафик(?:[^>]*>){4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces,
		parseBalance);

	AnyBalance.setResult(result);
}
