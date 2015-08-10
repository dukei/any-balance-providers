/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и бонусы украинской сети кофеен CoffeeLife

Сайт кофейни: https://coffeelife.com.ua/
Личный кабинет: https://coffeelife.com.ua/usercabinet
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://coffeelife.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		email2: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		if (/Вы неправильно ввели email или пароль./i.test(html))
			throw new AnyBalance.Error('Вы неправильно ввели email или пароль. Попробуйте еще раз.', null, true);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:[^\d]*([\d,.]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонусный счет:[^\d]*([\d,.]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}