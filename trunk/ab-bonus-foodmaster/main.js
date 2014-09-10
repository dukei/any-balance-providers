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
	var baseurl = 'http://www.food-master.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'extra/captcha-simple/');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'views/client/bonus-card.php', {
		card: prefs.login,
		password: prefs.password,
		'action': 'login',
		code:captchaa
	}, addHeaders({Referer: baseurl + 'login', 'X-Requested-With':'XMLHttpRequest'}));
	
	if (html) {
		var error = getParam(html, null, null, null, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	var result = {success: true};

	getParam(html, result, '__tariff', /Карта №(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий остаток(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'current', /Текущий процент бонуса:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'spend_this_month', /Потратили в текущем месяце:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'earn_this_month', /Получили бонусов в текущем месяце:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'recieve_this_month', /Еще получите бонусов за этот месяц:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_month_discount', /В следующем месяце ваш бонус:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}