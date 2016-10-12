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
	AnyBalance.setDefaultCharset('utf-8');

	// Если указан логин и пароль - заходим по нему и ищем наши объявления
	if (prefs.login && prefs.password) {
		AnyBalance.trace('Есть логин и пароль, заходим...');
		var baseurl = 'https://www.avito.ru/';

		var html = AnyBalance.requestGet(baseurl + 'profile', g_headers);

		html = requestPostMultipart(baseurl + 'profile/login', {
			'next': '/profile',
			login: prefs.login.trim(),
			password: prefs.password
		}, addHeaders({
			Referer: baseurl + 'profile'
		}));

		if (!/logout|profile\/exit/i.test(html)) {
			var error = getParam(html, null, null, /class="error-description"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces,
				html_entity_decode);
			if (error && /Неправильная пара электронная почта/i.test(error)) throw new AnyBalance.Error(error, null, true);
			if (error) throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}

		var ads = getElements(html, /<div[^>]+js-profile-item/ig);
		AnyBalance.trace('Нашли ' + ads.length + ' активных объявлений');
		var pattern = prefs.pattern && prefs.pattern.toLowerCase();
		for(var i=0; i<ads.length; ++i){
			var ad = ads[i];
			var name = getElement(ad, /<[^>]+profile-item-title/i, replaceTagsAndSpaces);
			if(pattern && name.toLowerCase().indexOf(pattern) < 0){
				AnyBalance.trace('Объявление ' + name + ' не содержит ' + pattern);
				continue;
			}
			AnyBalance.trace('Объявление ' + name + ' подошло');
			break;
		}

		if(i < ads.length){

			var result = {
				success: true
			};

			getParam(ad, result, 'views', /<span[^>]+profile-item-views-count[^\-][\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(ad, result, 'views_today', /<span[^>]+profile-item-views-count-today[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(name, result, 'adv_title');
			getParam(name, result, '__tariff');
			getParam(ad, result, 'price', /<div[^>]+profile-item-data-price[\s\S]*?<\/div>/i, replaceTagsAndSpaces, parseBalance);
			getParam(ad, result, ['currency', 'price'], /<div[^>]+profile-item-data-price[\s\S]*?<\/div>/i, replaceTagsAndSpaces, parseCurrency);
			getParam(ad, result, 'days_left', /<div[^>]+profile-item-lifetime[\s\S]*?<\/div>/i, replaceTagsAndSpaces,	parseBalance);
		}else{
			 throw new AnyBalance.Error('Не удаётся найти ни одного объявления');
		}

		AnyBalance.setResult(result);
		// Если нет ни логина ни пароля - просто ищем объявление
	} else {
		var region = prefs.region;
		var pattern = prefs.pattern;

		var pattern1 = pattern.replace(/ /g, "+");

		var baseurl = 'https://m.avito.ru/' + region + '?q=' + pattern1;

		AnyBalance.trace('Starting search: ' + baseurl);
		var info = AnyBalance.requestGet(baseurl);
		if(AnyBalance.getLastStatusCode() == 404)
			throw new AnyBalance.Error('Возможно, вы неправильно указали город. Чтобы его узнать, зайдите в браузере на avito.ru и перейдите на нужный город. Он появится в адресной строке браузера, например, ekaterinburg в http://www.avito.ru/ekaterinburg', null, true);

		/*var error = $('#errHolder', info).text();
		if(error){
			throw new AnyBalance.Error(error);
		}*/
		var result = {
			success: true
		};
		result.__tariff = prefs.pattern;

		if (matches = info.match(/не найдено/i)) {
			result.found = 0;
			AnyBalance.setResult(result);
			return;
		}

		var found = getParam(info, null, null, /<div[^>]*class="[^"]*nav-helper-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(found, result, 'found');

		if (!found) {
			throw new AnyBalance.Error("Ошибка при получении данных с сайта.");
		}
		if ((matches = info.match(/<article[^>]*class="[^"]*b-item[^"]*"[^>]*>[\s\S]*?<\/article>/ig))) {
			info = matches[0];
			getParam(info, result, 'date', /<div[^>]*class="[^"]*info-date[^"]*"[^>]*>([\s\S]*?),/i, replaceTagsAndSpaces);
			getParam(info, result, 'time', /<div[^>]*class="[^"]*info-date[^"]*"[^>]*>[\s\S]*?,([\s\S]*?)<\/div>/i,
				replaceTagsAndSpaces);

			var datetime;
			if (isset(result.date) && isset(result.time)) {
				datetime = result.date + ' ' + result.time;
			} else if (isset(result.date)) {
				datetime = result.date;
			} else if (isset(result.time)) {
				datetime = result.time;
			}
			if (datetime)
				getParam(datetime, result, 'datetime');

			getParam(info, result, 'last', /<h3[^>]*class="[^"]*item-header[^"]*"[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);
			getParam(info, result, 'price', /<div[^>]*class="[^"]*item-price[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
				replaceTagsAndSpaces, parseBalance);
			getParam(info, result, ['currency', 'balance'], /<div[^>]*class="[^"]*item-price[^"]*"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces,
				AB.parseCurrency);

		} else {
			throw new AnyBalance.Error("Ошибка при разборе ответа с сайта.");
		}

		AnyBalance.setResult(result);
	}
}
