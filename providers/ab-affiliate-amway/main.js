/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.amway.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet('http://www.amway.ru/ru/login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		else if (name == 'country_code')
			return 'ru';
		return value;
	});

	html = AnyBalance.requestPost(baseurl + '?action=auth.login', params, addHeaders({Referer: baseurl}));

	if(!/logout/i.test(html)){
			var error = getElementsByClassName(html, 'error_msg', replaceTagsAndSpaces, html_entity_decode);
			if (error.length)
				throw new AnyBalance.Error(error[0], null, /Вы указали неверный логин или пароль/i.test(error[0]));
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'my-points?flow.flow=my_points', g_headers);

	var table = getElementById(html, 'myPointsTable');
	if(!table)
		AnyBalance.trace('Не нашли таблицу с данными, сайт изменен?');

	var result = {success: true};
	getParam(table, result, 'personal_points', /Личные\s*?баллы\s*?:(?:[\s\S]*?<td[^>]*cell_1[\s\S]*?cell_2[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'group_points', /Групповые\/Лидерские\s*?Баллы\s*?:(?:[\s\S]*?<td[^>]*cell_1[\s\S]*?cell_2[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'personal_sales', /Личная\s*?ВO\s*?:(?:[\s\S]*?<td[^>]*cell_1[\s\S]*?cell_2[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'leader_sales', />\s*?Лидерская\s*?Величина\s*?Оборота\s*?\(ВО\)\s*?:(?:[\s\S]*?<td[^>]*cell_1[\s\S]*?cell_2[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, '__tariff', /Месяц\s*?и\s*?год(?:[\s\S]*?<td[^>]*cell_1[\s\S]*?cell_2[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}
