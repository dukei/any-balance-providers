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
	
	var html = AnyBalance.requestGet(baseurl + 'index.php?menu=kabinet', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'index.php?menu=kabinet', {
		login: prefs.login,
		word: prefs.password,
		'kod': '0'
	}, addHeaders({Referer: baseurl + 'index.php?menu=kabinet'}));
	
	if (!/Ваш лицевой счет/i.test(html)) {
		var error = getParam(html, null, null, /<font[^>]+#cc3300[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Сумма к оплате([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /лицевой счет\s*:\s*([\d]+)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /отчетный период\s*:\s*([^<]+)/i, replaceTagsAndSpaces);
	
	getParam(html, result, 'hot_water', /горячее водоснабжение(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cold_water', /холодное водоснабжение(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	var dt = new Date();
	var months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
	
	// Вроде есть только за предыдущий месяц данные
	for(var i=0; i<6; ++i){
		var month = months[new Date(dt.getFullYear(), dt.getMonth()-i, 1).getMonth()];
		AnyBalance.trace('Пробуем найти показания счетчиков за ' + month);
		var trWater = getParam(html, null, null, new RegExp('<tr[^>]*>\\s*<td[^>]*>\\s*"' + month + '"([\\s\\S]*?)</tr>', 'i'));
		if(trWater) {
			getParam(trWater, result, 'cold_water_counter', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(trWater, result, 'hot_water_counter', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			break;
		}
	}
	
	AnyBalance.setResult(result);
}