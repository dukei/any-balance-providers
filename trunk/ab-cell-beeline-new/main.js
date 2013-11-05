/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function getBlock(url, html, name, exact) {
	var formhtml = html;
	if (isArray(html)) { //Если массив, то разный хтмл для поиска блока и для формы
		formhtml = html[1];
		html = html[0];
	}

	var re = new RegExp("PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*update:\\s*'" + (exact ? "" : "[^']*:") + name);
	var data = getParam(html, null, null, re);
	if (!data) {
		AnyBalance.trace('Блок ' + name + ' не найден!');
		return '';
	}

	var formId = getParam(data, null, null, /formId:\s*'([^']*)/, replaceSlashes);
	if (!formId) {
		AnyBalance.trace('Не найден ID формы для блока ' + name + '!');
		return '';
	}

	var form = getParam(formhtml, null, null, new RegExp('<form[^>]+name="' + formId + '"[\\s\\S]*?</form>', 'i'));
	if (!form) {
		AnyBalance.trace('Не найдена форма ' + formId + ' для блока ' + name + '!');
		return '';
	}

	var params = createFormParams(form);
	var source = getParam(data, null, null, /source:\s*'([^']*)/, replaceSlashes);
	var render = getParam(data, null, null, /update:\s*'([^']*)/, replaceSlashes);

	params['javax.faces.partial.ajax'] = true;
	params['javax.faces.source'] = source;
	params['javax.faces.partial.execute'] = '@all';
	params['javax.faces.partial.render'] = render;
	//params[render] = render;
	params[source] = source;

	html = AnyBalance.requestPost(url, params, addHeaders({
		Referer: url,
		'Faces-Request': 'partial/ajax',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	data = getParam(html, null, null, new RegExp('<update[^>]*' + (exact ? 'id="' : '[^>]*:') + name + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i'));
	if (!data) {
		AnyBalance.trace('Неверный ответ для блока ' + name + ': ' + html);
		return '';
	}
	return data;
}

function refreshBalance(url, html, htmlBalance) {
	var data = getParam(htmlBalance, null, null, /PrimeFaces\.\w+\s*\(\s*\{[^}]*update:\s*'[^']*headerBalance/);
	if (!data) {
		AnyBalance.trace('Блок headerBalance не найден!');
		return '';
	}
	var source = getParam(data, null, null, /source:\s*'([^']*)/, replaceSlashes);
	var render = getParam(data, null, null, /update:\s*'([^']*)/, replaceSlashes);
	var form = getParam(htmlBalance, null, null, new RegExp('(<form[^>]+>)(?:[\\s\\S](?!</?form))*id="' + source + '"'));
	if (!form) {
		AnyBalance.trace('Не найдена форма для блока headerBalance!');
		return '';
	}

	var viewState = getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);

	var formId = getParam(form, null, null, /id="([^"]*)/i, null, html_entity_decode);
	var params = createFormParams(form);
	params['javax.faces.partial.ajax'] = true;
	params['javax.faces.source'] = source;
	params['javax.faces.partial.execute'] = '@all';
	params['javax.faces.partial.render'] = render;
	params[source] = source;
	params['javax.faces.ViewState'] = viewState;

	html = AnyBalance.requestPost(url, params, addHeaders({
		Referer: url,
		'Faces-Request': 'partial/ajax',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	data = getParam(html, null, null, new RegExp('<update[^>]+id="' + formId + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i'));
	if (!data) {
		AnyBalance.trace('Неверный ответ для блока headerBalance: ' + html);
		return '';
	}
	return data;
}

function myParseCurrency(text) {
	var val = html_entity_decode(text).replace(/\s+/g, '').replace(/[\-\d\.,]+/g, '');
	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	return val;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://my.beeline.ru/";
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'login.html', g_headers);

	var tform = getParam(html, null, null, /<form[^>]+name="loginFormB2C:loginForm"[^>]*>[\s\S]*?<\/form>/i);
	if (!tform) { //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
		if (AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
			throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
		}
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(tform);
	params['loginFormB2C:loginForm:login'] = prefs.login;
	params['loginFormB2C:loginForm:password'] = prefs.password;
	params['loginFormB2C:loginForm:passwordVisible'] = prefs.password;
	params['loginFormB2C:loginForm:loginButton'] = '';

	var action = getParam(tform, null, null, /<form[^>]+action="\/([^"]*)/i, null, html_entity_decode);

	//Теперь, когда секретный параметр есть, можно попытаться войти
	html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({
		Referer: baseurl + 'login.html'
	}));
	// Иногда билайн нормальный пароль считает временным и предлагает его изменить, но если сделать еще один запрос, пускает и показывает баланс
	if (/Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html)) {
		AnyBalance.trace('Билайн считает наш пароль временным, но это может быть и не так, попробуем еще раз войти...');
		html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({
			Referer: baseurl + 'login.html'
		}));
	}
	// Ну и тут еще раз проверяем, получилось-таки войти или нет
	if (/<form[^>]+name="chPassForm"|Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html)) 
		throw new AnyBalance.Error('Вы зашли по временному паролю, требуется сменить пароль. Для этого войдите в ваш кабинет https://my.beeline.ru через браузер и смените там пароль. Новый пароль введите в настройки данного провайдера.', null, true);
	if (/<form[^>]+action="\/changePass.html"/i.test(html))
		throw new AnyBalance.Error('Билайн требует сменить пароль. Зайдите в кабинет https://my.beeline.ru через браузер и поменяйте пароль на постоянный.', null, true);
	//После входа обязательно проверяем маркер успешного входа
	//Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
	if (!/logOutLink/i.test(html)) {
		//Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
		var error = getParam(html, null, null, [/<div[^>]+class="error-page[\s|"][^>]*>([\s\S]*?)<\/div>/i, /<span[^>]+class="ui-messages-error-summary"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неправильные логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		/*error = getParam(html, null, null, /<div[^>]+class="error-page[\s|"][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);*/
			
		if (AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
			throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
		}
		//Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	if (/b2b_post/i.test(html)) {
		fetchPost(baseurl, html);
	} else {
		fetchPre(baseurl, html);
	}
}

function parseBalanceNegative(str) {
	var val = parseBalance(str);
	if (isset(val)) 
		return -val;
}

function fetchPost(baseurl, html) {
	//Раз мы здесь, то мы успешно вошли в кабинет
	AnyBalance.trace('Мы в постоплатном кабинете');
	//Получаем все счетчики
	var result = {success: true, balance: null};

	var multi = /<span[^>]+class="marked"[^>]*>/i.test(html), xhtml;

	getParam(html, result, 'prebal', /ваша предварительная сумма по договору([\s\S]*?)<\/span><\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'prebal', 'overpay'], /ваша предварительная сумма по договору([\s\S]*?)<\/span><\/span>/i, replaceTagsAndSpaces, myParseCurrency);

	if (!multi) {
		AnyBalance.trace('Похоже на кабинет с одним номером.');

		getParam(html, result, 'phone', /<input[^>]+id="serviceBlock:paymentForm:[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

		xhtml = getBlock(baseurl + 'c/post/index.html', html, 'list-contents', true);
		getParam(xhtml, result, '__tariff', /<h2[^>]*>Текущий тариф([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

		getParam(xhtml, result, 'balance', /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], parseBalance);
		getParam(xhtml, result, ['currency', 'balance'], /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], myParseCurrency);

		if (isAvailableBonuses()) {
			//xhtml = getBlock(baseurl + 'c/post/index.html', html, 'loadingBonusesAndServicesDetails');
			xhtml = getBlock(baseurl + 'c/post/index.html', [xhtml, html], 'bonusesloaderDetails');
			getBonuses(xhtml, result);
		}
	} else {
		AnyBalance.trace('Похоже на кабинет с несколькими номерами.');

		var prefs = AnyBalance.getPreferences();
		if (prefs.phone) { //Если задан номер, то надо сделать из него регулярное выражение
			if (!/^\d{4,10}$/.test(prefs.phone)) throw new AnyBalance.Error('Введите от 4 до 10 последних цифр номера дополнительного телефона без пробелов и разделителей или не вводите ничего, чтобы получить информацию по первому номеру!', null, true);

			var regnumber = prefs.phone.replace(/(\d)/g, '$1[\\s\\-()]*');
			var re = new RegExp('(?:<a[^>]*>\\s*)?<span[^>]*>\\+7[0-9\\s\\-()]*' + regnumber + '</span>', 'i');
			var numinfo = getParam(html, null, null, re);
			if (!numinfo) throw new AnyBalance.Error('Не найден присоединенный к договору номер телефона, оканчивающийся на ' + prefs.phone);

			var num = getParam(numinfo, null, null, null, replaceTagsAndSpaces, html_entity_decode);
			if (/class="marked"/i.test(numinfo)) AnyBalance.trace('Дополнительный номер ' + num + ' уже выбран');
			else {
				AnyBalance.trace('Переключаемся на номер ' + num);
				var formid = getParam(numinfo, null, null, /addSubmitParam\('([^']*)/, replaceSlashes);
				var params = getParam(numinfo, null, null, /addSubmitParam\('[^']*',(\{.*?\})\)/, null, getJsonEval);
				var form = getParam(html, null, null, new RegExp('<form[^>]+id="' + formid + '"[^>]*>([\\s\\S]*?)</form>', 'i'));
				if (!form) {
					AnyBalance.trace(numinfo);
					throw new AnyBalance.Error('Дополнительный номер ' + num + ' найден, но переключиться на него не удалось. Возможны изменения в личном кабинете...');
				}

				var fparams = createFormParams(form);
				params = joinObjects(fparams, params);

				html = AnyBalance.requestPost(baseurl + 'c/post/index.html', params, addHeaders({
					Referer: baseurl + 'c/post/index.html'
				}));
			}

		}

		getParam(html, result, 'phone', /<span[^>]+class="marked"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

		//Если несколько номеров в кабинете, то почему-то баланс надо брать отсюда
		if (AnyBalance.isAvailable('balance', 'currency')) {
			xhtml = getBlock(baseurl + 'c/post/index.html', html, 'homeBalance');
			getParam(xhtml, result, 'balance', /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], parseBalance);
			getParam(xhtml, result, ['currency', 'balance'], /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], myParseCurrency);
		}

		xhtml = getBlock(baseurl + 'c/post/index.html', html, 'loadingTariffDetails');
		getParam(xhtml, result, '__tariff', /<div[^>]+:tariffInfo[^>]*class="(?:current|tariff-info)"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);

		if (isAvailableBonuses()) {
			xhtml = getBlock(baseurl + 'c/post/index.html', html, 'loadingBonusesAndServicesDetails');
			xhtml = getBlock(baseurl + 'c/post/index.html', [xhtml, html], 'bonusesloaderDetails');
			getBonuses(xhtml, result);
		}
	}

	if (AnyBalance.isAvailable('overpay')) {
		xhtml = getBlock(baseurl + 'c/post/index.html', html, 'callDetailsDetails');
		getParam(xhtml, result, 'overpay', /<h4[^>]*>Переплата[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(xhtml, result, 'overpay', /<h4[^>]*>Осталось к оплате[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceNegative);
	}

	if (AnyBalance.isAvailable('fio')) {
		xhtml = AnyBalance.requestGet(baseurl + 'm/post/index.html', g_headers);
		getParam(xhtml, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLenttersAndDecode);

	}
	//Возвращаем результат
	AnyBalance.setResult(result);
}

function fetchPre(baseurl, html) {
	//Раз мы здесь, то мы успешно вошли в кабинет предоплатный
	AnyBalance.trace('Мы в предоплатном кабинете');
	//Получаем все счетчики
	var result = {
		success: true,
		balance: null
	};
	getParam(html, result, 'phone', /<input[^>]+id="serviceBlock:paymentForm:[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

	var xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'currentTariffLoaderDetails');
	getParam(xhtml, result, '__tariff', [/<div[^>]+:tariffInfo[^>]*class="current"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, /<h2>Текущий тариф\s*([\s\S]*?)\s*<\/h2>/i], replaceTagsAndSpaces, html_entity_decode);

	if (AnyBalance.isAvailable('balance'/*, 'fio'*/)) {
		/*xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'balancePreHeadDetails');
		getParam(xhtml, result, 'balance', /у вас на балансе([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(xhtml, result, ['currency', 'balance'], /у вас на балансе([\s\S]*)/i, replaceTagsAndSpaces, myParseCurrency);
		getParam(xhtml, result, 'fio', /<span[^>]+class="b2c.header.greeting.pre.b2c.ban"[^>]*>([\s\S]*?)(?:<\/span>|,)/i, replaceTagsAndSpaces, html_entity_decode);*/
		xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'homeBalance');
		/*var tries = 0; //Почему-то не работает. Сколько раз ни пробовал, если первый раз баланс недоступен, то и остальные оказывается недоступен...
		while(/balance-not-found/i.test(xhtml) && tries < 20){
			AnyBalance.trace('Баланс временно недоступен, пробуем обновить: ' + (++tries));
			AnyBalance.sleep(2000);
			xhtml = refreshBalance(baseurl + 'c/pre/index.html', html, xhtml) || xhtml;
		} */
		getParam(xhtml, result, 'balance', /class="price[^>]*>([\s\S]*?)<\/h3>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], parseBalance);
		getParam(xhtml, result, ['currency', 'balance'], /class="price[^>]*>([\s\S]*?)<\/h3>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], myParseCurrency);
		//getParam(xhtml, result, 'fio', /<span[^>]+class="b2c.header.greeting.pre.b2c.ban"[^>]*>([\s\S]*?)(?:<\/span>|,)/i, replaceTagsAndSpaces, html_entity_decode);
	}
	if (isAvailableBonuses()) {
		xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'bonusesloaderDetails');
		getBonuses(xhtml, result);
	}
	if (AnyBalance.isAvailable('fio')) {
		xhtml = AnyBalance.requestGet(baseurl + 'm/pre/index.html', g_headers);
		getParam(xhtml, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLenttersAndDecode);
	}
	
	//Возвращаем результат
	AnyBalance.setResult(result);
}

function isAvailableBonuses() {
	return AnyBalance.isAvailable('sms_left', 'mms_left', 'rub_bonus', 'rub_opros', 'min_local', 'min_bi', 'min_local_clear');
}

function getBonuses(xhtml, result) {
	var bonuses = sumParam(xhtml, null, null, /<div[^>]+class="bonus-heading"[^>]*>[\s\S]*?<\/table>/ig);
	for (var j = 0; j < bonuses.length; ++j) {
		var bonus = bonuses[j];
		var bonus_name = getParam(bonus, null, null, /<div[^>]+class="bonus-heading"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		var services = sumParam(bonus, null, null, /<tr[^>]*>\s*<td[^>]+class="title"(?:[\s\S](?!<\/tr>))*?<td[^>]+class="value"[\s\S]*?<\/tr>/ig);
		for (var i = 0; i < services.length; ++i) {
			var name = '' + getParam(services[i], null, null, /<td[^>]+class="title"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode) + ' ' + bonus_name;
			if (/SMS|штук/i.test(name)) {
				sumParam(services[i], result, 'sms_left', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/MMS/i.test(name)) {
				sumParam(services[i], result, 'mms_left', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Рублей БОНУС|бонус-баланс/i.test(name)) {
				sumParam(services[i], result, 'rub_bonus', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Рублей за участие в опросе|Счастливое время/i.test(name)) {
				sumParam(services[i], result, 'rub_opros', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Времени общения/i.test(name)) {
				sumParam(services[i], result, 'min_local', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Секунд БОНУС\s*\+|Баланс бонус-секунд/i.test(name)) {
				sumParam(services[i], result, 'min_bi', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Секунд БОНУС-2|Баланс бесплатных секунд-промо/i.test(name)) {
				sumParam(services[i], result, 'min_local', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/минут в месяц|мин\./i.test(name)) {
				var minutes = getParam(services[i], null, null, /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				sumParam(60 * minutes, result, 'min_local', null, null, null, aggregate_sum);
				sumParam(minutes, result, 'min_local_clear', null, null, null, aggregate_sum);
			} else {
				AnyBalance.trace('Неизвестная опция: ' + bonus_name + ' ' + services[i]);
			}
		}
	}
}

/** Приводим все к единому виду вместо ИВаНов пишем Иванов */
function capitalFirstLenttersAndDecode(str) {
	str = html_entity_decode(str+'');
	var wordSplit = str.toLowerCase().split(' ');
	var wordCapital = '';
	for (i = 0; i < wordSplit.length; i++) {
		wordCapital += wordSplit[i].substring(0, 1).toUpperCase() + wordSplit[i].substring(1) + ' ';
	}
	return wordCapital.replace(/^\s+|\s+$/g, '');
}