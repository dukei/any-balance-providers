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
	var baseurl = 'https://ihelper.mts.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var html = AnyBalance.requestGet(baseurl, g_headers);
	var captchaa;
	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + 'capcha.jpg');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl, {
		category:'GSM',
		smooth:captchaa,
		enter:'Войти',
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		if(/Невірний код безпеки/i.test(html))
			throw new AnyBalance.Error('Не верно введены символы с картинки!');

		var error = getParam(html, null, null, /<span\s*style="color:red;">([\s\S]*?)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Невірний пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Ім'я користувача(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Особовий рахунок(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['balance', 'balance_calls', 'balance_at_month_begin' ])) {
		html = AnyBalance.requestGet(baseurl + 'finance/finance.do', g_headers);
		
		getParam(html, result, 'balance', /Сумарний баланс(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'balance_calls', /Сума розмов у поточному місяці(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'balance_at_month_begin', /Залишок на 1-е число(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	if(isAvailable(['bonus'])) {
		html = AnyBalance.requestGet(baseurl + 'bonus/bonusHistory.do', g_headers);
		
		getParam(html, result, 'bonus', /Загальна кількість бонусів(?:[\s\S]*?<td[^>]*>){1}([^<]*)/i, [/\./i, '', replaceTagsAndSpaces], parseBalance);
	}
	//getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}