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

		var html = AnyBalance.requestGet(baseurl + 'rossiya', g_headers);

		var tokenName = getParam(html, /<input[^>]+class="js-token"[^>]*name="([^"]*)/i, replaceHtmlEntities);
		var tokenValue = getParam(html, /<input[^>]+class="js-token"[^>]*value="([^"]*)/i, replaceHtmlEntities);

		var params = {
			remember: 'true',
			login: prefs.login.trim(),
			password: prefs.password,
		};

		params[tokenName] = tokenValue;
		params['g-recaptcha-response'] = solveRecaptcha('Пожалуйста, докажите, что вы не робот', AnyBalance.getLastUrl(), '6LekaEcUAAAAAHeBEnl8an4WEF2J8pSHZDebFTBZ');

		html = requestPostMultipart(baseurl + 'auth/login', params, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			Referer: AnyBalance.getLastUrl()
		}));

		var json = getJson(html);
		if(!json.success){
			var error;
			if(json.errors){
			    var errors = [];
			    for(var name in json.errors)
			        errors.push(json.errors[name])
			    error = errors.join('.\n');
			}
			if(error)
				throw new AnyBalance.Error(error, null, /парол|неправил/i.test(error));
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}

		html = AnyBalance.requestGet(baseurl + 'profile', addHeaders({Referer: baseurl}));
		if (!/logout|profile\/exit/i.test(html)) {
			var error = getParam(html, null, null, /class="[^"]*alert-red[^>]*>([\s\S]*?)<\/(?:p|div)>/i, replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /парол/i.test(error));
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}

		var pages = getElements(html, [/<a[^>]+class="pagination-page"/i, /\d+<\/a>/i]);
		AnyBalance.trace('Нашли ' + pages.length + ' доп страниц активных объявлений');

		var items = getPersonalItems(html);
		for(var i=0; i<pages.length; ++i){
			html = AnyBalance.requestGet(joinUrl(baseurl + 'profile', getParam(pages[i], /<a[^>]+href="([^"]*)/i, replaceHtmlEntities)), g_headers);
			var _items = getPersonalItems(html);
			items.push.apply(items, _items);
		}

		AnyBalance.trace('Нашли ' + items.length + ' активных объявлений');
		var pattern = prefs.pattern && prefs.pattern.toLowerCase();
		for(var i=0; i<items.length; ++i){
			var ad = items[i];
			var name = ad.title;
			if(pattern && name.toLowerCase().indexOf(pattern) < 0){
				AnyBalance.trace('Объявление ' + name + ' не содержит ' + pattern);
				continue;
			}
			AnyBalance.trace('Объявление ' + name + ' подошло');
			break;
		}

		if(i < items.length){

			var result = {
				success: true
			};

			getParam(ad.views.total, result, 'views');
			getParam(ad.views.today, result, 'views_today');
			getParam(name, result, 'adv_title');
			getParam(name, result, '__tariff');
			getParam(ad.price.hasValue ? ad.price.formatted : undefined, result, 'price', null, null, parseBalance);
			getParam(ad.price.postfix || '₽', result, ['currency', 'price']);
			getParam(Math.floor((ad.finishTime - new Date())/86400000), result, 'days_left');
		}else{
			 throw new AnyBalance.Error('Не удаётся найти ни одного объявления');
		}

		AnyBalance.setResult(result);
		// Если нет ни логина ни пароля - просто ищем объявление
	} else {
		checkEmpty(!prefs.region || /^[\w\-]+$/.test(prefs.region), 'Название города может содержать только буквы, цифры и дефис. Чтобы его узнать, зайдите в браузере на avito.ru и перейдите на нужный город. Он появится в адресной строке браузера, например, ekaterinburg в http://www.avito.ru/ekaterinburg');

		var region = prefs.region || 'rossiya';
		var pattern = prefs.pattern;

		var baseurl = 'https://www.avito.ru/' + region + '?q=' + encodeURIComponent(pattern);

		AnyBalance.trace('Starting search: ' + baseurl);
		var info = AnyBalance.requestGet(baseurl);
		if(AnyBalance.getLastStatusCode() == 404){
			if(/data-current-page="404"/i.test(info))
				throw new AnyBalance.Error('Вы неправильно указали город (' + region + '). Чтобы его узнать, зайдите в браузере на avito.ru и перейдите на нужный город. Он появится в адресной строке браузера, например, ekaterinburg в http://www.avito.ru/ekaterinburg', null, true);
			AnyBalance.trace('Получили 404, но похоже, просто нет объявлений');
		}

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

		var found = getParam(info, null, null, /<span[^>]*data-marker="page-title\/count"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(found, result, 'found');

		if (!found) {
			throw new AnyBalance.Error("Ошибка при получении данных с сайта.");
		}

		var ad = getElement(info, /<div[^>]+item_table-wrapper/ig);
		if (ad) {
			getParam(ad, result, 'datetime', /data-absolute-date="([^"]*)/i, replaceHtmlEntities);
			getParam(ad, result, 'date', /data-absolute-date="([^"]*?)\d+:\d+/i, replaceHtmlEntities);
			getParam(ad, result, 'time', /data-absolute-date="[^"]*?(\d+:\d+)/i, replaceHtmlEntities);

		//	getParam(info, result, 'last', /<h3[^>]*class="[^"]*item-header[^"]*"[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);
			getParam(info, result, 'price', /<span[^>]+data-marker="item-price"[^>]*>([\s\S]*?)<\/span>/i,
				replaceTagsAndSpaces, parseBalance);
			getParam(info, result, ['currency', 'balance'], /<span[^>]+data-marker="item-price"[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces,
				AB.parseCurrency);

		} else {
			throw new AnyBalance.Error("Ошибка при разборе ответа с сайта.");
		}

		AnyBalance.setResult(result);
	}
}

function getPersonalItems(html){
	var ads = getParam(html, /<div[^>]+js-personal-items\b[^>]+data-params=["']([^"']*)/i, replaceHtmlEntities, getJson);
	return ads.items;
}