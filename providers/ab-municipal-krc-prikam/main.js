/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function capitalFirstLetter(str) {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://old.krc-prikam.ru';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/cabinet_login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'name')
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + '/cabinet_login?destination=cabinet_login', params, addHeaders({Referer: baseurl + '/cabinet_login'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /имя пользователя или пароль неверны/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(html, result, 'account', /номер договора(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Состояние расчетов:<\/div><div class="value">.+\s+-\s+([^<]+)</i, [replaceTagsAndSpaces, /долг/i, '-', /переплата/i, ''], parseBalance);
	if (AnyBalance.isAvailable('balance') && !result.balance) {
		result.balance = 0;
	}
	getParam(html, result, 'fio', /покупатель(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'adress', /адрес(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'area', /площадь(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseFloat);
	getParam(html, result, 'people', /проживающих(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'provider', /продавец(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	// Не совсем правильно. Ниже загрузим список услуг
	// getParam(html, result, '__tariff', /предмет договора(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, capitalFirstLetter);
	html = AnyBalance.requestGet(baseurl + '/cabinet/services', addHeaders({Referer: baseurl + '/maindata'}));
	var table = getElement(html, /<table[^>]+class="content_table"[^>]*>/i);
	var services = [];
	var trs = getElements(table, /<tr[^>]*>/ig);
	for (var i = 0; i < trs.length; i++) {
		var tr = trs[i];
		var tds = getElements(tr, /<td[^>]+class="s">/ig, replaceTagsAndSpaces);
		if (tds[1]) {
			services.push(getParam(tds[1]));
		}
	}
	result.__tariff = services.join(', ');

	AnyBalance.setResult(result);
}
