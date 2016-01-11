/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.lantek.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({
		Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]+style="color:red"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверно указаны логин или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс(?:[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /кредит(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'blocked', /Заблокированные(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /родительский(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable(['__tariff', 'deadline'])) {
		html = AnyBalance.requestGet(baseurl+'?module=40_tariffs', g_headers);
		getParam(html, result, '__tariff', /текущий тп(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td/i, replaceTagsAndSpaces);
		getParam(html, result, 'deadline', /конец расчетного периода(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseDate);
	}

	if(isAvailable('paid')) {
		html = AnyBalance.requestGet(baseurl+'?module=41_services', g_headers);
		getParam(html, result, 'paid', /Списано абонентской платы(?:[\s\S]*?<td[^>]*>){14}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}