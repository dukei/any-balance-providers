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
	var baseurl = 'http://stat.putilovka.net:9443/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'index.cgi', g_headers);

	html = AnyBalance.requestPost(baseurl + 'index.cgi', {
		'language': 'russian',
		user: prefs.login,
		passwd: prefs.password,
		logined: 'войти'
	}, addHeaders({Referer: baseurl + 'index.cgi'}));
	
	if (!/>Информация о пользователе</i.test(html)) {
		var error = getParam(html, null, null, /err_message[^>]*>([\s\S]*?)<\/TABLE>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Счёт:([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /<td>Статус:[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /тарифный план[\s\S]*?<td>[\s\S]*?<b>([\s\S]*?)<\/b>/i, [replaceTagsAndSpaces, /-{2,}/i, '']);
	getParam(html, result, 'fio', /ФИО:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'dogovor', /Договор:(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}