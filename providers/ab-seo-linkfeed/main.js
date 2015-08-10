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
	var baseurl = 'http://www.linkfeed.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	var match = /<img alt="([^"]+)"\s*src="\/(system\/captcha[^"]+)"/i.exec(html);
	
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + match[2]);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'user/auth', {
		'user[login]': prefs.login,
		'user[password]': prefs.password,
		'captcha_validation': match[1],
		'captcha':captchaa
	}, addHeaders({Referer: baseurl + 'user/auth'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /span style="font-weight: bold; color :red;"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'expense_day', /Расход<(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'expense_week', /Расход<(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);	
	getParam(html, result, 'income_day', /Доход<(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'income_week', /Доход<(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);		
	getParam(html, result, 'partnership_day', /Партнерка<(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'partnership_week', /Партнерка<(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance)
	getParam(html, result, 'summ_day', /Сумма<(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'summ_week', /Сумма<(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}