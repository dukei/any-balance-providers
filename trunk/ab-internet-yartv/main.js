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
	var baseurl = 'https://cabinet.yartv.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php?r=site/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var captchaKey, captcha;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		captcha = getParam(html, null, null, /Введите символы с картинки[\s\S]*?<img[^>]+src="data:image\/png;base64,([^"]+)/i);
		if(!captcha)
			throw new AnyBalance.Error('Не удалось получить капчу! Попробуйте обновить данные позже.');
		captchaKey = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaKey);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
		'LoginForm[login]': prefs.login,
		'LoginForm[password]': prefs.password,
		'LoginForm[captcha]': captchaKey,
		yt0: 'Войти'
	}, addHeaders({Referer: baseurl + 'index.php?r=site/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="errorSummary"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var accounts = getParam(html, null, null, /Договоры[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i),
		account = getParam(accounts, null, null, /tbody[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>/i);

	var result = {success: true};
	
	getParam(account, result, 'balance', /(?:\s*<td[^>]*>[\s\S]*?<\/td>){2}(\s*<td[^>]*>[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'account', /\s*<td[^>]*>[\s\S]*?<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'operator', /(?:\s*<td[^>]*>[\s\S]*?<\/td>){1}(\s*<td[^>]*>[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /content-aside-цкфз(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}