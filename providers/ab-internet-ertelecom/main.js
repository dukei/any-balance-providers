/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
};

var g_region_change = {
	kzn: 'kazan',
	nch: 'chelny',
	novosib: 'nsk',
	spb: 'interzet',
};

function main() {
	AnyBalance.setDefaultCharset('utf-8');

	//	makeRegions();
	//	return;

	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region || 'kzn'; // Казань по умолчанию

	if (g_region_change[domain])
		domain = g_region_change[domain];

	AB.checkEmpty(prefs.log, 'Введите логин!');
	AB.checkEmpty(prefs.pwd, 'Введите пароль!');


	AnyBalance.trace('Selected region: ' + domain);
	var baseurl = 'https://lk.domru.ru/';

	AnyBalance.setCookie('domru.ru', 'citydomain'); //Удаляем старую куку
	AnyBalance.setCookie('.domru.ru', 'service', '0');
	AnyBalance.setCookie('.domru.ru', 'citydomain', domain, {
		path: '/'
	});
	AnyBalance.setCookie('.domru.ru', 'cityconfirm', '1', {
		path: '/'
	});

	var info = AnyBalance.requestGet(baseurl + "login", g_headers);

	if (!info || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.trace("Redirected to: " + AnyBalance.getLastUrl());

	var baseurlLogin = getParam(AnyBalance.getLastUrl(), /^https?:\/\/[^\/]*/i) + '/';
	AnyBalance.trace("baseurlLogin: " + baseurl);


	var form = getElement(info, /<form[^>]+login[^>]*>/i);
	if (!form)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	var params = createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name))
			return prefs.log;
		else if (/password/i.test(name))
			return prefs.pwd;

		return value;
	}, true);

	var action = getParam(form, /<form[^>]+action="([^"]*)/, replaceHtmlEntities);

	// Заходим на главную страницу
	var info = AnyBalance.requestPost(joinUrl(baseurlLogin, action), params, g_headers);

	if (!/возвращением|logout|выход/.test(info)) {
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

	info = AnyBalance.requestGet(baseurl);

	var result = {
		success: true
	};

	if (AnyBalance.isAvailable('balance', 'pay_till')) {
		var token = decodeURIComponent(AnyBalance.getCookie('YII_CSRF_TOKEN'));
		var res = AnyBalance.requestPost(baseurl + 'payments/default/GetDataForMoneybagWidget', [
			['YII_CSRF_TOKEN', token]
		], addHeaders({
			Referer: baseurl,
			Accept: 'application/json, text/javascript, */*; q=0.01',
			'X-Requested-With': 'XMLHttpRequest',
			Origin: 'https://lk.domru.ru',

		}));

		var user = {};
		try {
			user = getJson(res);
			
			getParam(user.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
			getParam(user.datePay, result, 'pay_till', null, replaceTagsAndSpaces, parseDateWord);
		} catch (e) {
			AnyBalance.trace(res);
			throw e;
		}

	}

	if(AnyBalance.isAvailable('bits')){
		var html = AnyBalance.requestGet(baseurl + 'index/default/GetloyaltyPoints', addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: baseurl + 'profile'}));
		var json = getJson(html);
		getParam(json.content, result, 'bits', null, replaceTagsAndSpaces, parseBalance);
 	}

	getParam(info, result, 'tariff_number', /<span[^>]+account-data-item_link[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(info, result, 'name', /b-head__account-data-item[^>]*data-name="([^"]*)/i, replaceTagsAndSpaces);
	getParam(info, result, '__tariff', /Ваш пакет[^<]*<a[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(info, result, 'status', /<a[^>]+href="[^"]*status.domru.ru"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function makeRegions() {
	var html = AnyBalance.requestGet('https://lk.domru.ru/login', g_headers);
	var elems = getElements(html, /<div[^>]+data-domain[^>]*>/ig);
	var values = [],
		names = [];
	for (var i = 0; i < elems.length; ++i) {
		var elem = elems[i];
		var name = getParam(elem, null, null, null, replaceTagsAndSpaces);
		var id = getParam(elem, null, null, /data-domain="([^"]*)/i, null);
		values.push(id);
		names.push(name);
	}

	AnyBalance.setResult({
		values: values.join('|'),
		names: names.join('|')
	});
}
