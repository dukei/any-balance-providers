/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
};

function main() {
	var prefs   = AnyBalance.getPreferences(),
		baseurl = 'http://my.rodnik.ua/';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'login', {
		username: prefs.login,
		password: prefs.password,
	}, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+danger[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Не верный пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'stats', g_headers);

	//Номенклатура
	AB.getParam(html, result, 'name', 		   /<div[^>]*>Скидки(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	//Скидка в прошлом месяце
	AB.getParam(html, result, 'discount_prev', /<div[^>]*>Скидки(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//Скидка в этом месяце
	AB.getParam(html, result, 'discount_now',  /<div[^>]*>Скидки(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//Предполагаемая скидка в следующем месяце
	AB.getParam(html, result, 'discount_next', /<div[^>]*>Скидки(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	//Прошлый месяц, л
	AB.getParam(html, result, 'used_prev', 		/Счетчики потребления(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//Этот месяц, л
	AB.getParam(html, result, 'used_now',       /Счетчики потребления(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//Дозаправить до текущего порога скидки, л
	AB.getParam(html, result, 'need_use_now',   /Счетчики потребления(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//Дозаправить до следующего порога скидки, л
	AB.getParam(html, result, 'need_use_next',  /Счетчики потребления(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//За все время, л
	AB.getParam(html, result, 'used_total',     /Счетчики потребления(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	//Потрачено за прошлый месяц, грн
	AB.getParam(html, result, 'spent_prev', /Потрачено(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	//Потрачено за этот месяц, грн
	AB.getParam(html, result, 'spent_now',  /Потрачено(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	//Категория авто
	AB.getParam(html, result, 'category',           /Категория авто(?:[^>]*>){2}([^<]*)/i,                 AB.replaceTagsAndSpaces);
	//Накоплено литров
	AB.getParam(html, result, 'accumulated',        /Накоплено литров(?:[^>]*>){2}([^<]*)/i,               AB.replaceTagsAndSpaces, AB.parseBalance);
	//Осталось накопить
	AB.getParam(html, result, 'left_to_accumulate', /Осталось накопить(?:[^>]*>){2}([^<]*)/i,              AB.replaceTagsAndSpaces, AB.parseBalance);
	//Порог накопления
	AB.getParam(html, result, 'limit', 	   			/Порог накопления(?:[^>]*>){2}([^<]*)/i, 			   AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
