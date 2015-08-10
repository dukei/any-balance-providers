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
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		back:baseurl + 'login',
		user_name: prefs.login,
		user_password: prefs.password,
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="alert([^>]+>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	if(prefs.digits) {
		var account = getParam(html, null, null, new RegExp('<option value="([^"]+)"[^>]*>\\s*\\d+' + prefs.digits, 'i'), replaceTagsAndSpaces);
		checkEmpty(account, 'Не удалось переключится на счет с последними цифрами ' + prefs.digits, true);
		
		html = AnyBalance.requestPost(baseurl + 'trader-account/set-active-account', {
			'back':'https://account.forex4you.org/ru/trader-account/',
			'current_account_id':account
		}, addHeaders({Referer: baseurl + 'trader-account'}));
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:([^>]+>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred', /Кредитные Бонусы([^>]+>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'cred'], /Валюта:([^>]+>){3}/i, [replaceTagsAndSpaces, /\s*центов\s*/i, ''], html_entity_decode);
	getParam(html, result, '__tariff', />[^<]+счет(?:[^>]+>){2}\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', />[^<]+счет(?:[^>]+>){2}\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'arm', /Плечо:([^>]+>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Имя:([^>]+>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}