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
	var baseurl = 'https://account.forex4you.org/ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'authentication', JSON.stringify({
		username: prefs.login,
		password: prefs.password
	}), addHeaders({
		'Origin': 'https://account.forex4you.org',
		'Content-Type': 'application/json;charset=UTF-8',
		'Accept': 'application/json;version=1.0',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl+'login'
	}));

	var json = getJson(html);
	if (json.code) {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /Имя пользователя или пароль введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	if(prefs.digits) {
		html = AnyBalance.requestGet(baseurl+'trader-account/start', g_headers);
		var account = getParam(html, null, null, new RegExp('<option[^>]+value="([^"]+)"[^>]*>' + prefs.digits, 'i'), replaceTagsAndSpaces);
		checkEmpty(account, 'Не удалось переключится на счет с последними цифрами ' + prefs.digits, true);
		
		html = AnyBalance.requestPost(baseurl + 'trader-account/set-active-account', {
			'back':'https://account.forex4you.org/ru/trader-account/start',
			'current_account_id':account
		}, addHeaders({
			Referer: baseurl + 'trader-account/start'}));
	}
	else
		html = AnyBalance.requestGet(baseurl+'trader-account/start', g_headers);

	var result = {success: true};
	getParam(html, result, 'balance', /Баланс:(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred', /Кредитные Бонусы(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'cred'], /валюта:(?:[^>]*>){1}([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /\s*центов\s*/i, '']);
	getParam(html, result, 'server', /Сервер:(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /торговый счет:(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'arm', /плечо:(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /Имя:([^>]+>){3}/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}