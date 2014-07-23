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
	var baseurl = 'https://3mob.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet('http://3mob.ua/', g_headers);

	html = AnyBalance.requestPost(baseurl + 'application/ajax/auth', {
		email: prefs.login,
		password: prefs.password,
	}, addHeaders({
		Referer: baseurl + 'login',
		'X-Requested-With':'XMLHttpRequest'
	}));

	var json = getJson(html);

	if(!json.result) {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /Невірний логін або пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'application/customer/balances', g_headers);

	var result = {success: true};

	getParam(html, result, 'deadline', />\s*Дата деактивації:([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'balance', />\s*Основний грошовий баланс([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_bonus', />\s*Бонусний грошовий баланс([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'minutes_local', />\s*Голосовий баланс у мережі ТриМоб,&nbsp;сек.([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'minutes_roam', />\s*Голосовий баланс у мережі ТриМоб та нац. роумінгу,&nbsp;сек.([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'internet_roam', />\s*Інтернет у мережі ТриМоб та нац. роумінгу,&nbsp;Кб([^>]*>){4}/i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'internet_local', />\s*Інтернет у мережі ТриМоб,&nbsp;Кб([^>]*>){4}/i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'internet_roaming', />\s*Інтернет у нац. Роумінгу,&nbsp;Кб([^>]*>){4}/i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'balance_sms', />\s*SMS([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'money_transfer', />\s*Money Transfer([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);

	html = AnyBalance.requestGet(baseurl + 'application/customer', g_headers);
	//Когда появится сменить __tariff на название тарифного плана
	getParam(html, result, '__tariff', />\s*Номер телефону<[^>]*>\s*<[^>]*>\s*<[^>]*>([^<]*)</i, replaceTagsAndSpaces);
	getParam(html, result, 'mobphone', />\s*Номер телефону<[^>]*>\s*<[^>]*>\s*<[^>]*>([^<]*)</i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}