/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://fermasosedi.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);

	var cookie = getParam(html, null, null, /'_ddn_intercept_2_=([^;]+)/i);
	AnyBalance.setCookie('fermasosedi.ru', '_ddn_intercept_2_', cookie);

	html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + 'login/code.php', addHeaders({Referer: baseurl}));
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login/', {
		user: prefs.login,
		pass: prefs.password,
		code: captchaa
	}, addHeaders({Referer: 'http://fermasosedi.ru/' }));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<b>(Отказано в доступе[\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance_pay', /Баланс для оплаты:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_out', /Баланс для вывода:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'energy', /Энергия:(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}