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
	var baseurl = 'http://erczd.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'adm6.php', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'adm6.php', {
		login: prefs.login,
		word: prefs.password,
		'kod': '0'
	}, addHeaders({Referer: baseurl + 'adm6.php'}));
	
	if (!/Выход из &quot;Личный кабинет/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Сумма к оплате([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /лицевой счет\s*:\s*([\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var dt = new Date();
	var months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
	
	// Вроде есть только за предыдущий месяц данные
	var month = dt.getMonth() > 0 ? months[dt.getMonth()-1] : months[dt.getMonth()];
	var trWater = getParam(html, null, null, new RegExp('<tr>\\s*<td[^>]*>\\s*"' + month + '"(?:[^>]*>){21}\\s*</tr>', 'i'));
	if(trWater) {
		getParam(trWater, result, 'cold_water', /(?:[^>]*>){10}\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(trWater, result, 'hot_water', /(?:[^>]*>){17}\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}