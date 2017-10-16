/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.volia.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.pass, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'kiev/ru/faq', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getParam(html, null, null, /<form[^>]+id="userLoginForm"[^>]+>[^]+?<\/form>/i);

	var params = createFormParams(form, function(params, str, name, value) {
		AnyBalance.trace(name + ' = ' + value);
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.pass;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'kiev/ru/signin', params, addHeaders({
		Referer: baseurl + 'kiev/ru/faq',
		'X-Requested-With':'XMLHttpRequest'
	}));

	var redirect = AnyBalance.getLastResponseHeader('X-Success-Url');

	if(!redirect){
		if(AnyBalance.getLastStatusCode() == 403)
			throw new AnyBalance.Error('Не перный логин или пароль.', null, true);	
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl + redirect, g_headers);

	if (!/signout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'kiev/ru/cockpit/dashboard', g_headers);

	getParam(html, result, '__tariff', /<div class="packageDescrption ">\s*<p>\s*<span>[^<]*<\/span>\s*<span class=[^>]*>\s*<img [^>]*>\s*<span>[^>]*<\/span>\s*<\/span>\s*<\/p>\s*<span class=[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий баланс[^]+?<div/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'amountToPay', /name="amountToPay"[^>]*value="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ndogovor', /№ Договора[^>]*>\s*<span[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /\/signout[^>]*>\s*<\/a>\s*<\/div>\s*<span[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	form = getParam(html, null, null, /<input name="_csrf" type="hidden" value="[^]+?" \/>/i);

	params = createFormParams(form, function(params, str, name, value) {
		AnyBalance.trace(name + ' = ' + value);

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'kiev/ru/cockpit/common/devices/fragment', params, addHeaders({
		Referer: baseurl + 'kiev/ru/faq',
		'X-Requested-With':'XMLHttpRequest'
	}));

	getParam(html, result, 'ktel', /tvCounter">([^<]+)/i, replaceTagsAndSpaces, parseBalance);

	html = AnyBalance.requestGet(baseurl + 'kiev/ru/cockpit/services', g_headers);

	getParam(html, result, 'kodtarif', /data-tm-code="(\d+)"/i, replaceTagsAndSpaces, parseBalance);

	form = getParam(html, null, null, /<input name="_csrf" type="hidden" value="[^]+?" \/>/i);

	params = createFormParams(form, function(params, str, name, value) {
		AnyBalance.trace(name + ' = ' + value);

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'kiev/ru/cockpit/common/speedup/fragment', params, addHeaders({
		Referer: baseurl + 'kiev/ru/faq',
		'X-Requested-With':'XMLHttpRequest'
	}));

	getParam(html, result, 'kkan', /Телевидение\s*<\/b>\s*<span>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'speed', /Интернет\s*<\/b>\s*<span>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    
	html = AnyBalance.requestPost(baseurl + '/kiev/ru/cockpit/loyalty/bonuses', params, addHeaders({
		Referer: baseurl + 'kiev/ru/faq',
		'X-Requested-With':'XMLHttpRequest'
	}));
    
	getParam(html, result, 'bonuses', /bonusAmountLabel" class=[^>]*>([^<]+)бонусов/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
