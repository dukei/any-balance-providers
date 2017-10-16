/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

var baseurl = 'http://tlstar.ru/';

function main() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var html = AnyBalance.requestPost(baseurl + 'personal/', {
		login:prefs.login,
		password:prefs.password,
		cmd:'login'
	}, addHeaders({
		Referer: baseurl
	}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]+class="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Логин или пароль неверны/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	var titleDIV = getParam(html, null, null, /<div[^>]+class="personal-menu-title personal-title"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	if(/телефон/i.test(titleDIV))
		doTelephonyProvider(html, result);
	else
		doInternetProvider(html, result);

	AnyBalance.setResult(result);
}

function doTelephonyProvider (html, result) {
	var href;

	if(isAvailable('balance')) {

		href = getParam(html, null, null, /<div[^>]+class="personal-menu-title">(?:[\s\S]*?<li[^>]*>){2}<a[^>]+href="([\s\S]*?)"/i, [/\./i, 'personal']);
		if(!href)
			AnyBalance.trace('Не удалось найти ссылку c информацией о платежах. Сайт изменен?');
		else {
			html = AnyBalance.requestGet(baseurl+'personal/?op=payments', g_headers);
			getParam(html, result, 'balance', /Ваш текущий баланс:([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
		}
	}

	if(isAvailable(['telNumber', 'fio', 'cost', 'debt', 'discount'])) {

		href = getParam(html, null, null, /<div[^>]+class="personal-menu-title">(?:[\s\S]*?<li[^>]*>){3}<a[^>]+href="([\s\S]*?)"/i);
		if(!href)
			AnyBalance.trace('Не удалось найти ссылку на квитанцию. Сайт изменен?');
		else {
			html = AnyBalance.requestGet(baseurl + href, g_headers);
			getParam(html, result, 'telNumber', /Тел\.([\s\S]*?)фио/i, replaceTagsAndSpaces);
			getParam(html, result, 'fio', /ФИО:([\s\S]*?)<br/i, replaceTagsAndSpaces);
			getParam(html, result, 'debt', /Задолженность за прошедший период(?:[^>]*>){5}([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cost', /(?:абонентская плата|Абон. плата)(?:[^>]*>){5}([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'discount', /Скидка(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		}
	}
}

function doInternetProvider (html, result) {
	var href;

	getParam(html, result, 'balance', /текущий баланс:[\s\S]*?<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'block', /Состояние блокировки: ([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /лицевой счет ([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<div[^>]+class="personal-menu-title personal-title"[^>]*>([\s\S]*?)\,/i, replaceTagsAndSpaces);

	href = getParam(html, null, null, /<div[^>]+class="personal-menu-title"[^>]*>(?:[\s\S]*?<li[^>]*>){6}<a[^>]+href="([\s\S]*?)"/i, [/\./i, 'personal']);
	if(!href)
		AnyBalance.trace('Не удалось найти ссылку c информацией о тарифах. Сайт изменен?');
	else {
		html = AnyBalance.requestGet(baseurl+href, g_headers);
		getParam(html, result, '__tariff', /ваш текущий тариф:(?:[^>]*>){2}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
	}

	if(isAvailable(['cost', 'paid'])) {

		href = getParam(html, null, null, /<div[^>]+class="personal-menu-title"[^>]*>(?:[\s\S]*?<li[^>]*>){5}<a[^>]+href="([\s\S]*?)"/i, [/\./i, 'personal'])
		if(!href)
			AnyBalance.trace('Не удалось найти ссылку c информацией по услугам. Сайт изменен?');
		else {
			html = AnyBalance.requestPost(baseurl+href, {
				startquery: 'Показать'
			}, addHeaders({
				Origin: baseurl
			}));
			getParam(html, result, 'cost', /(?:абонентская плата|Абон. плата)(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'paid', /(?:абонентская плата|Абон. плата)(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		}
	}

	if(isAvailable(['incomingTraffic', 'outgoingTraffic'])) {

		href = getParam(html, null, null, /<div[^>]+class="personal-menu-title"[^>]*>(?:[\s\S]*?<li[^>]*>){7}<a[^>]+href="([\s\S]*?)"/i, [/\./i, 'personal']);
		if(!href)
			AnyBalance.trace('Не удалось найти ссылку c информацией о трафике. Сайт изменен?');
		else {
			html = AnyBalance.requestPost(baseurl+href, {
				mode: 'summary',
				startquery: 'Показать'
			}, addHeaders({
				Origin: baseurl
			}));
			getParam(html, result, 'incomingTraffic', /Входящий(?:[\s\S]*?<td[^>]*>)[\s\S]*?<\/td>/i, replaceTagsAndSpaces, parseTraffic);
			getParam(html, result, 'outgoingTraffic', /Исходящий(?:[\s\S]*?<td[^>]*>)[\s\S]*?<\/td>/i, replaceTagsAndSpaces, parseTraffic);
		}
	}
}