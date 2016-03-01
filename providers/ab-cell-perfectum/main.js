/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
};

function main() {
	var
		prefs = AnyBalance.getPreferences(),
		baseurl = 'http://my.cdma.uz/';
	AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	// AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'get_password.php', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	//запрос на смс с паролем

	var
		token = AB.getParam(html, null, null, /картинки:[\s\S]*?<img[^>]*src="([^"]*)"/i),
		user_input,
		request_msg;

	if (!token) {
		throw new AnyBalance.Error('Не удалось получить url для картинки с кодом. Сайт изменен?');
	}

	token = token.replace(/\'/gi, '%27');

	user_input = getCaptcha(baseurl, [token, '']);

	if (!user_input) {
		throw new AnyBalance.Error('Не удалось получить ввод пользователя');
	}

	//http://my.cdma.uz/image.php?k=%27Hw0oYw0=%27
	//http://my.cdma.uz/image.php?k=%27DR9jBig=%27

	request_msg = 'Получить+пароль';

	html = AnyBalance.requestPost(baseurl + 'get_password.php', {
		'PhoneNumberF': prefs.login,
		'codevalueF': user_input,
		'spf': encodeURIComponent(request_msg)
	}, AB.addHeaders({
		Referer: baseurl + 'get_password.php'
	}));

	if (/Ошибка/i.test(html)) {
		var wrong_number_error = AB.getParam(html, null, null, /Ошибка[\s\:]*([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
		if (wrong_number_error) {
			throw new AnyBalance.Error(wrong_number_error, null, /номер|Услуга|код/i.test(wrong_number_error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	AnyBalance.trace('Похоже введён верный код с картинки');

	var dialog_msg = '';

	if (/SMS\s+с\s+паролем/i.test(html)) { //проверка что пароль уже был выслан ( не разрешено больше 1 пароля в час)
		dialog_msg = AB.getParam(html, null, null, /(SMS\s+с\s+паролем[\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
		AnyBalance.trace(dialog_msg);
	}

	//пароль только раз в час
	user_input = AnyBalance.retrieveCode('Введите пароль к личному кабинету из СМС. ' + dialog_msg, null);

	html = AnyBalance.requestPost(baseurl + 'auth.php', {
		'login': prefs.login,
		'password': user_input
	}, AB.addHeaders({
		Referer: baseurl + 'login.php'
	}));

	if (!/logout|Выход/i.test(html)) {
		var error = AB.getParam(html, null, null, /(?:[\s\S]*?<table[^>]*>){3}([\s\S]*?)<\/table>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};


	var //контракт
		table = html.match(/Состояние\s+контракта[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i)[1],
		tr = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);

	AB.getParam(tr[1], result, 'begin_balance', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(tr[1], result, 'accrued', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(tr[1], result, 'paid', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(tr[1], result, 'current_balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(tr[1], result, 'prePayment', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(tr[1], result, 'payment_usd', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(tr[1], result, 'payment_uzs', /(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AnyBalance.trace('данные по контракту собраны');

	//телефон
	table = html.match(/<b[^>]*>\s*Телефон\s*<\/b>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i)[1];
	tr = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);

	AB.getParam(tr[1], result, 'phone_number', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(tr[1], result, 'date_connection', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(tr[1], result, 'status', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(tr[1], result, 'date_yet_another', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(tr[1], result, '__tariff', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(tr[1], result, 'phone_balance', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.trace('данные по телуфону собраны');

	AnyBalance.setResult(result);
}


function getCaptcha(baseurl, captcha_url_part_arr, dialog_msg) {
	var
		captcha_value,
		captcha_html,
		left = captcha_url_part_arr[0],
		right = captcha_url_part_arr[1] || '',
		captcha_msg = dialog_msg || 'Пожалуйста, введите код с картинки';

	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('request captcha');
		captcha_html = AnyBalance.requestGet(baseurl + left + right);
		captcha_value = AnyBalance.retrieveCode(captcha_msg, captcha_html);
		AnyBalance.trace('user\'s response: ' + captcha_value);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	return captcha_value;
}