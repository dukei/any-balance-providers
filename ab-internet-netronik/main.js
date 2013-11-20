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
	var baseurl = 'https://cabinet.netronik.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setAuthentication(prefs.login, prefs.password);
	
	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!/Добро пожаловать в Ваш личный кабинет/i.test(html)) {
		var error = getParam(html, null, null, /<H3>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Нужно ввести свои имя пользователя и пароль для доступа к личному кабинету/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	getParam(html, result, '__tariff', /тарифный план:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние счета:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}