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
	var baseurl = 'https://info.khotkovo.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login.aspx?ReturnUrl=%2fexit.aspx', g_headers);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'LoginTextBox') 
			return prefs.login;
		else if (name == 'PwdTextBox')
			return prefs.password;

		return value;
	});	
	
	html = AnyBalance.requestPost(baseurl + 'login.aspx?ReturnUrl=%2fexit.aspx', params, addHeaders({Referer: baseurl + 'login.aspx?ReturnUrl=%2fexit.aspx'}));

	if (!/Выйти\s*из\s*личного\s*кабинета/i.test(html)) {
		var error = getParam(html, null, null, /ErrorLabel"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /ФИО пользователя:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Баланс счета:[\s\S]*?<td[^>]*>([\s\S]*?)(?:до|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Баланс счета:[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>)/i, [/[\s\S]*?до/i, '', replaceTagsAndSpaces], parseDate);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<span[^>]+NetStateLabel[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}