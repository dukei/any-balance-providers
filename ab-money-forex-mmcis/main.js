/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ru.forex-mmcis.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'msg.html?s', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'user/login/', {
        login:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: baseurl + 'msg.html?s'}));
	
	if(!/menu_pc_exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*class=["']error[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Пользователя с логином[\s\S]*?не найдено/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'fio', /Владелец счёта:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Всего на счету:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'dostupno', 'bonus'], /Всего на счету:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'dostupno', /Доступно к снятию:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонусов:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'invest', /Инвестировано в Index TOP(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable(['income_last_month', 'average_income_per_month'])) {	
		html = AnyBalance.requestGet(baseurl + 'investment/', g_headers);
		
		getParam(html, result, 'income_last_month', /Доходность за прошлый месяц[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'average_income_per_month', /Средняя доходность за месяц[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}