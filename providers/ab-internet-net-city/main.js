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
	var baseurl = 'https://stat.net-city.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login.php', {
		user: prefs.login,
		password: prefs.password,
		'show_lang': 'lang_ru_w1251.php'
	}, addHeaders({Referer: baseurl + 'login.php'}));
	
	if (!/images\/exit\.gif/i.test(html)) {
		var error = getParam(html, null, null, /<label title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность вводимых данных/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /На денежном счету(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /ФИО(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Пакет(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	
	var days = getParam(html, null, null, /До окончания пакета:([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(days.toFixed(0), result, 'days');
	
	AnyBalance.setResult(result);
}