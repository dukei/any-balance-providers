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
	var baseurl = 'http://www.foreca.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.city_name, 'Введите название города!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	// в нормальном виде cookie не применяются, если '%3D' => '=' и '%26' => '&'
	AnyBalance.setCookie('www.foreca.ru', 'st2', 'lang%3Dru%26units%3Dmetricmmhg%26tf%3D24h', {path: '/'});

	/* Проверяем доступность прогноза для указанного города */

	html = AnyBalance.requestPost(baseurl, {
		q: prefs.city_name,
		do_search: 'Find place',
		country_id: 'ru'
	}, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при определении города! Попробуйте позже.');
	}

	// проверяем есть такой город или нет
	var expr = 'Результаты выбора\\s*?<\/h1[^>]*?>[\\s\\S]*?<dd>[\\s\\S]*?<a[^>]*?href\\s*?=\\s*?"([\\s\\S]*?)"[\\s\\S]*?' + prefs.city_name + '[\\s\\S]*?<\/a[^>]*?>'
	var rx = new RegExp(expr, 'i');
	var cityHref = getParam(html, null, null, rx);
	if (!cityHref) {
		var error = getParam(html, null, null, /Результаты\s*?выбора<\/h1[\s\S]*?class\s*?=\s*?['"]clearb[\s\S]*?<p[^>]*?>([\s\S]*?)<\/p[^>]*?>/i, replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Ваш выбор остался без результата/i.test(error));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось определить город. Сайт изменен?');
		}
	}

	/* Получаем данные */

	//переходим на страницу с прогнозом
	var html = AnyBalance.requestGet(baseurl + cityHref.substring(1), g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при получении прогноза! Попробуйте позже.');
	}

	var result = {success: true};

	if (AnyBalance.isAvailable('city')) {
		var city = getElementsByClassName(html, 'entry-title', replaceTagsAndSpaces);
		if (city.length) {
			result.city = city[0];
		} else {
			result.city = null;
		}
	}

	var table = getElementsByClassName(html, 'table t_cond');
	if(!table.length) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить прогноз. Сайт изменен?');
	} else {
		table = table[0];
	}

	if (AnyBalance.isAvailable('temp')) {
		var temp = getElementsByClassName(table, 'txt-xxlarge', replaceTagsAndSpaces, parseBalance);
		if (temp.length) {
			result.temp = temp[0];
		} else {
			result.temp = null;
		}
	}

	getParam(table, result, 'wind', /Фактическая\s*?погода[\s\S]*?<img[^>]*?wind[\s\S]*?>\s*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	var replaceWind = ['N', 'С', 'S', 'Ю', 'W', 'З', 'E', 'В'];
	getParam(table, result, 'wind_dir', /Фактическая\s*?погода[\s\S]*?<img[^>]*?wind[\s\S]*?alt\s*?=\s*['"]([\s\S]*?)['"][^>]*?>/i, replaceWind);
	getParam(table, result, 'atmo_conditions', /Фактическая\s*?погода[\s\S]*?<img[^>]*?symb[\s\S]*?alt\s*?=\s*['"]([\s\S]*?)['"][^>]*?>/i, replaceTagsAndSpaces);

	getParam(table, result, 'rf_temp', /Ощущается\s*?как[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);

	getParam(table, result, 'pressure', /Барометр[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'point_dew', /Точка\s*?росы[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'humidity', /От.\s*?влажность[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'line_of_sight', /Видимость[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'rising', /Восход\s*?солнца[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseMinutes);
	getParam(table, result, 'setting', /Закат\s*?солнца[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseMinutes);
	getParam(table, result, 'dayLength', /Долгота\s*?дня[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseMinutes);


	AnyBalance.setResult(result);
}
