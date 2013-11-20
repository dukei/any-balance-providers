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
	var baseurl = 'http://k5.ru/';
	AnyBalance.setDefaultCharset('windows-1251');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'cgi-bin/k5-4/lskso', g_headers);

	html = AnyBalance.requestPost(baseurl + 'cgi-bin/k5-4/lskso', {
		'numid': 1,
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'cgi-bin/k5-4/lskso'}));

	if (!/\/exit\?/i.test(html)) {
		var error = getParam(html, null, null, /<h4[^>]*#aa0000[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Вы ввели неправильные данные, повторите ввод/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /Ф\.И\.О\.:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'uniq_id', /Ваш уникальный номер:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /На Вашем лицевом счете в КСО:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}