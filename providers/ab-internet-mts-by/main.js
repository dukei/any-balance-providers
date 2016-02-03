
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
интернет МТС Беларусь
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
	var baseurl = 'https://internet.mts.by/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	if (!/\d{9}/i.test(prefs.login)) {
		throw new AnyBalance.Error(
			'Номер телефона должен состоять из 9 цифр (как на сайте), например 001234567, и быть без пробелов, разделителей и кода +375 '
		);
	}


	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var authToken = AB.getParam(html, null, null, /name="[^"]*authenticity[^"]*"[\s\S]*?value="([^"]*)"/i);

	if (!authToken) {
		throw new AnyBalance.Error('не удалось получить токен для входа', null, true);
	}

	AnyBalance.trace(authToken);

	html = AnyBalance.requestPost(baseurl + 'session', {
		'utf8': '',
		'authenticity_token': authToken,
		'phone_number': prefs.login,
		'password': prefs.password,
		'commit': 'Войти'
	}, AB.addHeaders({
		Referer: baseurl + 'session'
	}));


	if (!/выйти/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]*class="[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
			AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /пароль|заблокирован/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	var data = AB.getElement(html, /<div[^>]*class="[^"]*box-list[^"]*"[^>]*>/i);

	AB.getParam(data, result, 'name', /пользователь(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(data, result, 'phoneNumber', /номер\sтелефона(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(data, result, 'balance', /баланс(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['currency', 'balance'], /баланс(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces,
		AB.parseCurrency);
	AB.getParam(data, result, '__tariff', /тарифный(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(data, result, 'status', /статус(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

	if (AnyBalance.isAvailable('servicesInfo')) {

		var
			table = AB.getElement(html, /<table[^>]*class="[^"]*info[^"]*"[^>]*>/i),
			trArray = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi),
			tdArray = [],
			servicesInfo = [],
			service = '',
			date1 = '',
			status = '',
			date2 = '';

		for (var i = 1; i < trArray.length; i++) {
			tdArray = AB.sumParam(trArray[i], null, null, /<td[^>]*>([\s\S]*?)<\/td>/gi);

			service = AB.getParam(tdArray[0], null, null, null, AB.replaceTagsAndSpaces);
			date1 = AB.getParam(tdArray[1], null, null, null, AB.replaceTagsAndSpaces);
			status = AB.getParam(tdArray[2], null, null, null, AB.replaceTagsAndSpaces);
			date2 = AB.getParam(tdArray[3], null, null, null, AB.replaceTagsAndSpaces);
			servicesInfo.push(service + ' | ' + status + ' | ' + date2);
		}
		AB.getParam(servicesInfo.join('<br/>'), result, 'servicesInfo');

	}

	AnyBalance.setResult(result);
}
