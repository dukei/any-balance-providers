/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.dfiles.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login.php?return=%2F', g_headers);
	
	html = AnyBalance.requestGet('http://www.google.com/recaptcha/api/challenge?k=6LdRTL8SAAAAAE9UOdWZ4d0Ky-aeA7XfSqyWDM2m&ajax=1&cachestop=0.3058106261305511&lang=ru', g_headers);

	var chalange = getParam(html, null, null, /challenge\s*:\s*["']([^'"]*)/i);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet('http://www.google.com/recaptcha/api/image?c='+ chalange);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'api/user/login', {
		login: prefs.login,
		password: prefs.password,
		recaptcha_challenge_field: chalange,
		recaptcha_response_field: captchaa
	}, addHeaders({Referer: baseurl + 'login.php?return=%2F'}));
	
	if (!/"status":"OK"/i.test(html)) {
		if (/"CaptchaInvalid"/i.test(html))
			throw new AnyBalance.Error('Не верно введены цифры с картинки!');
			
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'gold/bonus_program.php', g_headers);
	
	getParam(html, result, 'balance', /Текущий баланс:(?:[^>]*>)([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outpay_balance', /Запрошенная выплата:(?:[^>]*>)([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'earned_today', /Заработано сегодня:(?:[^>]*>)([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'earned_estoday', /Заработано вчера:(?:[^>]*>)([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}