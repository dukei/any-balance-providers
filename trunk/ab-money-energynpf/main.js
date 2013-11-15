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
	var baseurl = 'https://online.npfe.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	var loginRegexp = /(\d{3})(\d{3})(\d{3})(\d{2})/i.exec(prefs.login);
		
	if(!loginRegexp) {
		throw new AnyBalance.Error('Введите логин без разделителей, 11 цифр подряд.', null, true);
	}
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'poffice/login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'poffice/j_spring_security_check', {
		j_username: loginRegexp[1]+'-'+loginRegexp[2]+'-'+loginRegexp[3]+' '+ loginRegexp[4],
		j_password: prefs.password,
		submit: 'Вход'
	}, addHeaders({Referer: baseurl + 'poffice/login'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<strong>(Ошибка авторизации:<\/strong>[^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /На всех моих счетах:(?:[\s\S]*?<[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_income', /из них инвестиционный доход(?:[\s\S]*?<[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}