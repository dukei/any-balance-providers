
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
	var baseurl = 'https://letyshops.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'ajax/login7/ajax', {}, g_headers);
	var json = getJson(html);
	var form = json[1].output;

	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'mail') {
			return prefs.login;
		} else if (name == 'pass') {
			return prefs.password;
		}

		return value;
	});

	html = requestPostMultipart(baseurl + 'ajax/login7/ajax', params, AB.addHeaders({
		Referer: baseurl
	}));

	if (!/"command"\s*:\s*"reload"/i.test(html)) {
		var json = getJson(html);
		var output = json[1].output;
		var error = AB.getElement(output, /<div[^>]+error/i, [/<h[^>]*>([\s\S]*?)<\/h[^>]*>/ig, '', AB.replaceTagsAndSpaces]);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол|некоррект/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl, g_headers);
	var data = getParam(html, null, null, /Drupal.ssiData\s*=\s*('[^']*')/i, [/^/, 'return '], safeEval);
	data = getJson(data);

	html = AnyBalance.requestGet(baseurl + 'user/' + data.user.id + '/balance', g_headers);

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /В ожидании:[\s\S]*?<span[^>]+amount[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'available', /На балансе:[\s\S]*?<span[^>]+amount[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	var order = getElement(html, /<tr[^>]+order/i);
	if(order){
		AB.getParam(order, result, 'last_sum', /Сумма заказа:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(order, result, 'last_date', /Дата заказа:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
		AB.getParam(order, result, 'last_place', /<div[^>]+title[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		AB.getParam(order, result, 'last_cashback', /<td[^>]+amount[^>]*>([\s\S]*?)<\/td>/i, [/Тип аккаунта:?/i, '', AB.replaceTagsAndSpaces], parseBalance);
	}

	html = AnyBalance.requestGet(baseurl + 'user/' + data.user.id, g_headers);
	result.__tariff = getElement(html, /<div[^>]+until-text/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
