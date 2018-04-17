/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 	'gzip, deflate, sdch',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://portal-irkutsk.itgkh.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+id="form-office"[^>]*>/i);

	if(!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("На странице не найдена форма авторизации. Сайт изменен?");
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'form[login]') 
			return prefs.login;
		else if (name == 'form[password]')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'index/login/', params, addHeaders({
		'X-Requested-With': 'xmlhttprequest',
		'HTTP_X_REQUESTED_WITH': 'xmlhttprequest',
		Referer: baseurl,
		Origin: baseurl,
	}));

	var json = getJson(html);
	
	if (json.status != 'success') {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'account/', g_headers);

	if(!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет после авторизации. Сайт изменен?');
	}

	var result = {success: true};

	getParam(html, result, 'abonent', /абонент:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /Адрес дома:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'apart_num', /№ квартиры:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'space', /Площадь помещения, кв.м.:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'min_vznos', /Размер минимального взноса:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'dop_vznos', /Размер дополнительного взноса:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'owner_part', /Доля помещения, занимаемая собственником:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fund_form_method', /Способ формирования фонда:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'account_num', /Номер расчетного счета:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'bank', /Банк:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'korrs', /Корр\/с:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'bik', /БИК:(?:[\s\S]*?<input[^>]*value=")([^"]*)/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'account/accrual');
	var table = getElementsByClassName(html, 'data_table');

	if (!table || !table.length) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию о платежах. Сайт изменен?');
	}

	var items = parseTable(table[0]);
	result['current_period'] = items[0];
	result['in_saldo'] = parseBalance(items[1]);
	result['accrued'] = parseBalance(items[2]);
	result['paid'] = parseBalance(items[4]);
	result['out_saldo'] = parseBalance(items[5]);

	AnyBalance.setResult(result);
}

function parseTable(html)
{
	var items = [],
		match = 1,
		i = 0,
		regexp = /<td>(.*)<\/td>/g;

	while (match != null) {
		i++;
		match = regexp.exec(html);
		if (match) items.push(replaceAll(match[1], replaceTagsAndSpaces));
		if (i > 5) break;
	}

	return items;
}
