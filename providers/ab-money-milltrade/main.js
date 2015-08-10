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
	var baseurl = 'https://milltrade.net/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'cabinet/accounts/', g_headers);

	html = AnyBalance.requestPost(baseurl + 'auth/login/', {
		login: prefs.login,
		password: prefs.password,
		submit: 'Войти'
	}, addHeaders({Referer: baseurl + 'cabinet/accounts/'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /Всего на счете:(?:[^>]*>){3}([\s\S]*?)<\/dd/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'currency', /Всего на счете:(?:[^>]*>){3}([\s\S]*?)<\/dd/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'avail_balance', /Доступно для снятия:(?:[^>]*>){3}([\s\S]*?)<\/dd/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'trade_bills', /Торговые счета:(?:[^>]*>){3}([\s\S]*?)<\/dd/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'inv_goldseven', /Инвестировано в программу «Золотая 7»:(?:[^>]*>){3}([\s\S]*?)<\/dd/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'inv_mill_invest', /Инвестировано в программу «Mill-invest»:(?:[^>]*>){3}([\s\S]*?)<\/dd/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses', /Бонусы(?:[^>]*>){3}([\s\S]*?)<\/dd/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable('average')) {
		html = AnyBalance.requestGet(baseurl + 'asset-management/golden-7/', g_headers);
		
		getParam(html, result, 'average', /СРЕДНЯЯ ДОХОДНОСТЬ ЗА МЕСЯЦ СОСТАВИЛА:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}