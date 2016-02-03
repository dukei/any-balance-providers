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

var g_region_change = {
	kzn: 'kazan',
	nch: 'chelny',
	novosib: 'nsk'
};

function main() {
	AnyBalance.setDefaultCharset('utf-8');

	//	makeRegions();
	//	return;

	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region || 'kzn'; // Казань по умолчанию

	if (g_region_change[domain])
		domain = g_region_change[domain];

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	AB.checkEmpty(prefs.region, 'Введите пароль!');

	AnyBalance.trace('Selected region: ' + domain);
	var baseurl = 'https://lk.domru.ru/';

	info = AnyBalance.requestGet(baseurl + "login", g_headers);


	if (!info || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(info, /<form[^>]+login-form[^>]*>/i);
	if (!form)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	AnyBalance.setCookie('domru.ru', 'citydomain'); //Удаляем старую куку
	AnyBalance.setCookie('.domru.ru', 'service', '0');
	AnyBalance.setCookie('.domru.ru', 'citydomain', domain, {
		path: '/'
	});
	AnyBalance.setCookie('.domru.ru', 'cityconfirm', '1', {
		path: '/'
	});

	var params = createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name))
			return prefs.login;
		else if (/password/i.test(name))
			return prefs.password;

		return value;
	}, true);

	// Заходим на главную страницу
	var info = AnyBalance.requestPost(baseurl + "login", params, g_headers);

	if (!/\/logout|выход/.test(info)) {
		var error = AB.getParam(info, null, null, /<div[^>]*class="[^"]*lk-form-block-error[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
			AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}


		if (AnyBalance.getLastStatusCode() >= 500) {
			AnyBalance.trace(info);
			throw new AnyBalance.Error(
				'Ошибка сервера. Подождите немного и попробуйте ещё раз. Если ошибка сохраняется долгое время, попробуйте войти в личный кабинет через браузер. Если там то же самое, обращайтесь в поддержку Дом.ру.'
			);
		}

		AnyBalance.trace(info);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	if (AnyBalance.isAvailable(['balance', 'pay_till'])) {
		var token = getParam(info, null, null, /<input[^>]+value="([^"]*)"[^>]*name="YII_CSRF_TOKEN"/i);
		var res = AnyBalance.requestPost(baseurl + 'user', [
			['needProperties[]', 'balance'],
			['needProperties[]', 'dataPay'],
			['needProperties[]', 'paymentAmount'],
			['YII_CSRF_TOKEN', token]
		], addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));

		var user = {};
		try {
			user = getJson(res);
		} catch (e) {}

		getParam(user.bill.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam(user.bill.datePay, result, 'pay_till', null, replaceTagsAndSpaces, parseDateWord);
	}

	getParam(info, result, 'tariff_number', /<span[^>]+account-data-item_link[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces,
		html_entity_decode);
	getParam(info, result, 'name', /b-head__account-data-item[^>]*data-name="([^"]*)/i, replaceTagsAndSpaces,
		html_entity_decode);
	getParam(info, result, '__tariff', /Ваш пакет[^<]*<a[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'bits', /status[^>]*bonus"[^>]*>([^]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'status', /<a[^>]+href="[^"]*status.domru.ru"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces,
		html_entity_decode);

	AnyBalance.setResult(result);
}

function makeRegions() {
	var html = AnyBalance.requestGet('https://lk.domru.ru/login', g_headers);
	var elems = getElements(html, /<div[^>]+data-domain[^>]*>/ig);
	var values = [],
		names = [];
	for (var i = 0; i < elems.length; ++i) {
		var elem = elems[i];
		var name = getParam(elem, null, null, null, replaceTagsAndSpaces, html_entity_decode);
		var id = getParam(elem, null, null, /data-domain="([^"]*)/i, null, html_entity_decode);
		values.push(id);
		names.push(name);
	}

	AnyBalance.setResult({
		values: values.join('|'),
		names: names.join('|')
	});
}
