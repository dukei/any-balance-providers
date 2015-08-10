/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.89 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.nlink.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cgi-bin/clients/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.sleep(2000);
	
	html = AnyBalance.requestPost(baseurl + 'cgi-bin/clients/login', {
		login: prefs.login,
		password: prefs.password,
		action: 'validate',
		submit: 'Вход'
	}, addHeaders({Referer: baseurl + 'cgi-bin/clients/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Ваш баланс[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /Статистика пользователя(?:[^>]*>){3}([^<,]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'accnum', /счет N([^<]+)/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable('bonus')){
		html = AnyBalance.requestGet(AnyBalance.getLastUrl() + '&action=bonus', g_headers);

		getParam(html, result, 'bonus', /Бонусный баланс:<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}