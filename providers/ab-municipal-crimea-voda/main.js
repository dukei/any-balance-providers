
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
	var baseurl = 'http://voda.crimea.ru/';
	// для нового сайта авторизация не через логин пароль, а через мобильный телефон
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин (номер телефона)!');
	AB.checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона без пробелов и разделителей. Например, 9031234567!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ajax.php', {
		snippet: 'loginNew',
		phone: prefs.login.replace(/(\d{3})(\d{3})(\d\d)(\d\d)/, '($1) $2-$3-$4'),
	}, AB.addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl
	}));

	var json = getJson(html);
	if(json.mod != 3){
		var error = json.err;
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(json.err));
		if(json.mod == 2)
			throw new AnyBalance.Error('Номер не найден в базе', null, true);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + 'ajax.php', {
		snippet: 'loginNew',
		pass: prefs.password,
	}, AB.addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl
	}));

	json = getJson(html);

	if(json.mod != 1){
		var error = json.err;
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(json.err));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'account', g_headers);

	var result = {
		success: true
	};

	AB.getParam(html, result, 'licschet', /л\/с №([^<]*)/i);
	AB.getParam(html, result, 'address', /(<[^>]*m-icon-cont[\s\S]*?)<span/i, replaceTagsAndSpaces);
	AB.getParam(html, result, 'debt', /Cостояние на сегодня:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /Долг:?/i, '-'], AB.parseBalance);

	html = AnyBalance.requestPost(baseurl + 'ajax.php', {
		snippet: 'oborot',
		account: '0'
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'account'
	}));

	AB.getParam(html, result, 'date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\s+/g, ' ']);
	AB.getParam(html, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\s+/g, ' ']);
	AB.getParam(html, result, 'spent', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	AB.getParam(html, result, 'payed', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	AB.getParam(html, result, 'debt_start', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
