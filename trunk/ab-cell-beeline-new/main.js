﻿/**
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

	var re = new RegExp("PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*update:\\s*'" + (exact ? "" : "[^']*") + name);
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
	// Костыль для бонусов
	if(/bonusesForm/i.test(name)) {
		name = getParam(name, null, null, /([^\s]+)/i);
	}
	var re = new RegExp('<update[^>]*id="' + (exact ? '' : '[^"]*') + name + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i');
	data = getParam(html, null, null, re);
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

function checkCorrectNumberLogin(html, prefs) {
	var phone = getParam(html, null, null, [/"sso-number"[^>]*>([^<]*)/i, /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i], [/\D/g, '']);
	if(!phone)
		throw new AnyBalance.Error('Не удалось выяснить на какой номер мы залогинились, сайт изменен?');
	
	AnyBalance.trace('Судя по всему, мы уже залогинены на номер ' + phone);
	
	var needeedPhone = prefs.phone || prefs.login;
	if(!endsWith(phone, needeedPhone)) {
		AnyBalance.trace('Залогинены на неправильный номер ' + phone + ' т.к. в настройках указано, что номер должен заканчиваться на ' + needeedPhone);
		throw new AnyBalance.Error('В настоящее время Билайн не поддерживает обновление чужого номера через мобильный интернет. Обновите этот аккаунт через Wi-Fi.');
	}
	AnyBalance.trace('Залогинены на правильный номер ' + phone);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://my.beeline.ru/";
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'login.html', g_headers);
	
	if (AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
		throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
	}
	
	if(prefs.__debug) {
		try {
			html = AnyBalance.requestGet('https://my.beeline.ru/c/'+prefs.__debug+'/index.html', g_headers);
		} catch(e){
		}
	}
	
	AnyBalance.trace('Запрашиваем login.html');
	AnyBalance.trace(html);
	
	var tform = getParam(html, null, null, /<form[^>]+name="loginFormB2C:loginForm"[^>]*>[\s\S]*?<\/form>/i);
	
	// Похоже что обновляемся через мобильный инет, значит авторизацию надо пропустить
	if(/logOutLink|Загрузка баланса\.\.\./i.test(html)) {
		AnyBalance.trace('Похоже, что мы запустились через мобильный интернет.');
		// Теперь необходимо проверить, на то номер мы вошли или нет, нужно для обновления через мобильный интернет
		checkCorrectNumberLogin(html, prefs);
	}
	// Авторизуемся, независимо ни от чего, кроме как от наличия формы входа
	if(tform) {
		/*if (!tform) { //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
		    AnyBalance.trace('Похоже, форма авторизации отсутствует.');
			if (AnyBalance.getLastStatusCode() > 400) {
				AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
				throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
			}
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		} else */{
		    AnyBalance.trace('Похоже, что форма авторизации присутствует.');
		}
		
		var params = createFormParams(tform);
		params['loginFormB2C:loginForm:login'] = prefs.login;
		params['loginFormB2C:loginForm:password'] = prefs.password;
		params['loginFormB2C:loginForm:passwordVisible'] = prefs.password;
		params['loginFormB2C:loginForm:loginButton'] = '';
		
		var action = getParam(tform, null, null, /<form[^>]+action="\/([^"]*)/i, null, html_entity_decode);
		
		//Теперь, когда секретный параметр есть, можно попытаться войти
		try {
			html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({Referer: baseurl + 'login.html'}));
		} catch(e) {
			if(prefs.__debug) {
				html = AnyBalance.requestGet(baseurl + 'c/' + prefs.__debug + '/index.html');
			} else {
				throw e;
			}
		}
	}
	// Иногда билайн нормальный пароль считает временным и предлагает его изменить, но если сделать еще один запрос, пускает и показывает баланс
	if (/Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html)) {
		AnyBalance.trace('Билайн считает наш пароль временным, но это может быть и не так, попробуем еще раз войти...');
		html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({
			Referer: baseurl + 'login.html'
		}));
	}
	// Ну и тут еще раз проверяем, получилось-таки войти или нет
	if (/<form[^>]+name="(?:chPassForm)"|Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html))
		throw new AnyBalance.Error('Вы зашли по временному паролю, требуется сменить пароль. Для этого войдите в ваш кабинет https://my.beeline.ru через браузер и смените там пароль. Новый пароль введите в настройки данного провайдера.', null, true);
	if (/<form[^>]+action="\/(?:changePass|changePassB2C).html"/i.test(html))
		throw new AnyBalance.Error('Билайн требует сменить пароль. Зайдите в кабинет https://my.beeline.ru через браузер и поменяйте пароль на постоянный.', null, true);
	//После входа обязательно проверяем маркер успешного входа
	//Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
	if (!/logOutLink/i.test(html)) {
		//Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
		var error = getParam(html, null, null, [/<div[^>]+class="error-page[\s|"][^>]*>([\s\S]*?)<\/div>/i, /<span[^>]+class="ui-messages-error-summary"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Неправильные логин и\s*(?:\(или\)\s*)?пароль/i.test(error));
		
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
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в постоплатном кабинете');

	var result = {success: true, balance: null, currency: null};
	var multi = /<span[^>]+class="selected"[^>]*>/i.test(html), xhtml='';

	getParam(html, result, 'agreement', /<h2[^>]*>\s*Договор №([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
//	xhtml = getBlock(baseurl + 'c/post/index.html', html, 'list-contents', true); //Это строка вообще приводила к созданию/отмене заявки на смену тарифного плана
//	getParam(xhtml, result, '__tariff', /<h2[^>]*>(?:[\s\S](?!<\/h2>))*?Текущий тариф([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<h2[^>]*>(?:[\s\S](?!<\/h2>))*?Текущий тариф([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (!multi) {
		AnyBalance.trace('Похоже на кабинет с одним номером.');
	} else {
		AnyBalance.trace('Похоже на кабинет с несколькими номерами.');

		getParam(html, result, 'fio', /<div[^>]+class="ban-param name">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

		if (prefs.phone) { //Если задан номер, то надо сделать из него регулярное выражение
			if (!/^\d{4,10}$/.test(prefs.phone)) throw new AnyBalance.Error('Введите от 4 до 10 последних цифр номера дополнительного телефона без пробелов и разделителей или не вводите ничего, чтобы получить информацию по первому номеру!', null, true);

			var regnumber = prefs.phone.replace(/(\d)/g, '$1[\\s\\-()]*');
			var re = new RegExp('(?:<a[^>]*>\\s*)?<span[^>]*>\\+7[0-9\\s\\-()]*' + regnumber + '</span>', 'i');
			var numinfo = getParam(html, null, null, re);
			if (!numinfo) 
				throw new AnyBalance.Error('Не найден присоединенный к договору номер телефона, оканчивающийся на ' + prefs.phone);

			var num = getParam(numinfo, null, null, null, replaceTagsAndSpaces, html_entity_decode);
			if (/class="selected"/i.test(numinfo)) {
				AnyBalance.trace('Дополнительный номер ' + num + ' уже выбран');
			} else {
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

				html = AnyBalance.requestPost(baseurl + 'c/post/index.html', params, addHeaders({Referer: baseurl + 'c/post/index.html'}));
				/*if (AnyBalance.getLastStatusCode() > 400) {
					AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
					throw new AnyBalance.Error('Переключится на доп. номер не удолось из-за технических проблем в личном кабинете Билайн. Проверьте, что вы можете переключиться на доп. номер, зайдя в личный кабинет через браузер.');
				}*/
				// Вроде помогает переход на главную
				html = AnyBalance.requestGet(baseurl + 'c/post/index.html', g_headers);
			}
		}
		//Если несколько номеров в кабинете, то почему-то баланс надо брать отсюда
		if (AnyBalance.isAvailable('balance')) {
			xhtml = getBlock(baseurl + 'c/post/index.html', html, 'homeBalance');
			
			var balance = getParam(xhtml, null, null, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], parseBalance);
			if(!isset(balance))
				balance = getParam(html, null, null, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Баланс временно недоступен/ig, ''], parseBalance);
			
			getParam(balance, result, 'balance');
		}
	}
	
	getParam(html, result, ['phone', 'traffic_used'], /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (isAvailableBonuses()) {
		xhtml = getBlock(baseurl + 'c/post/index.html', html, 'loadingBonusesAndServicesDetails');
		xhtml = getBlock(baseurl + 'c/post/index.html', [xhtml, html], 'bonusesloaderDetails');
		getBonusesPost(xhtml, result);
	}
	
    if (AnyBalance.isAvailable('overpay', 'prebal', 'currency')) {
    	xhtml = getBlock(baseurl + 'c/post/index.html', html, 'callDetailsDetails');
		
    	getParam(xhtml, result, 'overpay', /<h4[^>]*>Переплата[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(xhtml, result, 'overpay', /<h4[^>]*>Осталось к оплате[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceNegative);
    	getParam(xhtml, result, 'prebal', /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(xhtml, result, ['currency', 'prebal', 'overpay'], /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, myParseCurrency);
		
		AnyBalance.trace(xhtml);
		if(/информация[^<]*недоступна/)
			AnyBalance.trace('Информация временно недоступна на сайте Билайн, попробуйте позже');
    }

	if (!multi && AnyBalance.isAvailable('fio', 'balance', 'currency')) {
		//Это надо в конце, потому что после перехода на m/ куки, видимо, портится.
		xhtml = AnyBalance.requestGet(baseurl + 'm/post/index.html', g_headers);
		getParam(xhtml, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLenttersAndDecode);
		// Вроде бы все хорошо, но: {"sms_left":3463,"min_local":24900,"balance":0,"phone":"+7 909 169-24-86","agreement":"248260674","__time":1385043751223,"fio":"Максим Крылов","overpay":619.07,"min_local_clear":415,"currency":"рубвмесяцОтключитьБудьвкурсе","__tariff":"«Всё включено L 2013»"}
		getParam(xhtml, result, 'balance', /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, replaceTagsAndSpaces, parseBalance);
		// Если баланса нет, не надо получать и валюту
		if(isset(result.balance) && result.balance != null) {
			getParam(xhtml, result, ['currency', 'balance'], /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, replaceTagsAndSpaces, myParseCurrency);
		}
	}
	
	if(prefs.__debug){
		//Проверяем, не создалась ли лишняя заявка в процессе просмотра личного кабинета
        html = AnyBalance.requestGet(baseurl + 'c/operations/operationsHistory.html');
        var last_time = getParam(html, null, null, /<span[^>]+class="date"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        AnyBalance.trace('Последняя заявка: ' + last_time);
    }
	
	// Получение трафика из детализации
	if(result.phone && isAvailable(['traffic_used'])) {
		var num = getParam(result.phone, null, null, null, [/\+\s*7([\s\d\-]{10,})/i, '$1', /\D/g, '']);
		
		AnyBalance.trace('Пробуем получить данные по трафику из детализации по номеру: ' + num);
		html = AnyBalance.requestGet(baseurl + 'c/post/fininfo/report/detailUnbilledCalls.html?ctn=' + num, g_headers);
		xhtml = getBlock(baseurl + 'c/post/fininfo/report/detailUnbilledCalls.html', html, 'retrieveSubCurPeriodDataDetails');
		
		getParam(xhtml, result, 'traffic_used', /Итоговый объем данных \(MB\):([^>]*>){3}/i, [replaceTagsAndSpaces, /([\s\S]*?)/, '$1 мб'], parseTraffic);
	}

	//Возвращаем результат
	AnyBalance.setResult(result);
}

function fetchPre(baseurl, html) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в предоплатном кабинете');
	
	var result = {success: true, balance: null/*, currency: null*/};
	
	if (prefs.phone) { //Если задан номер, то надо сделать из него регулярное выражение
		if (!/^\d{4,10}$/.test(prefs.phone))
			throw new AnyBalance.Error('Введите от 4 до 10 последних цифр номера дополнительного телефона без пробелов и разделителей или не вводите ничего, чтобы получить информацию по первому номеру!', null, true);
		//   <div[^>]*(?:>)[^>]*onclick="\s*selectAccount\(['"]\d*4114['"][^>]*
		var re = new RegExp('div[^>]*(?:>)[^>]*onclick="\\s*selectAccount\\([\'\\"]\\d*' + prefs.phone + '[\'\\"][^>]*', 'i');
		var numinfo = getParam(html, null, null, re);
		if (!numinfo)
			throw new AnyBalance.Error('Не найден присоединенный к договору номер телефона, оканчивающийся на ' + prefs.phone);

		var num = getParam(numinfo, null, null, /selectAccount\('([^']*)/, replaceSlashes);
		if (/sso-account-current/i.test(numinfo))
			AnyBalance.trace('Дополнительный номер ' + num + ' уже выбран');
		else {
			AnyBalance.trace('Переключаемся на номер ' + num);
			var formid = getParam(html, null, null, /changeUser\s*=[^<]*?formId:'([^']*)/, replaceSlashes);
			var source = getParam(html, null, null, /changeUser\s*=[^<]*?source:'([^']*)/, replaceSlashes);
			var form = getParam(html, null, null, new RegExp('<form[^>]+id="' + formid + '"[^>]*>([\\s\\S]*?)</form>', 'i'));
			if (!form) {
				AnyBalance.trace(numinfo);
				throw new AnyBalance.Error('Дополнительный номер ' + num + ' найден, но переключиться на него не удалось. Возможны изменения в личном кабинете...');
			}

			var fparams = createFormParams(form);
			params = joinObjects(fparams, {
				'javax.faces.partial.ajax':'true',
				'javax.faces.source':source,
				'javax.faces.partial.execute':'@all',
				newSsoLogin: num
			});
			params[source] = source;

			var xhtml = AnyBalance.requestPost(baseurl + 'c/pre/index.html', params, addHeaders({Referer: baseurl + 'c/pre/index.html'}));
			var url = getParam(xhtml, null, null, /<redirect[^>]+url="\/([^"]*)/i, null, html_entity_decode);
			if(!url)
				AnyBalance.trace('Не удалось переключить номер: ' + xhtml);
			else
				html = AnyBalance.requestGet(baseurl + url, addHeaders({Referer: baseurl + 'c/pre/index.html'}));
		}
	}
	getParam(html, result, 'phone', /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	
	var xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'currentTariffLoaderDetails');
	getParam(xhtml, result, '__tariff', [/<div[^>]+:tariffInfo[^>]*class="current"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, /<h2>(?:[\s\S](?!<\/h2>))*?Текущий тариф\s*([\s\S]*?)\s*<\/h2>/i], replaceTagsAndSpaces, html_entity_decode);
	
	if (AnyBalance.isAvailable('balance'/*, 'fio'*/)) {
		/*xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'balancePreHeadDetails');
		getParam(xhtml, result, 'balance', /у вас на балансе([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(xhtml, result, ['currency', 'balance'], /у вас на балансе([\s\S]*)/i, replaceTagsAndSpaces, myParseCurrency);
		getParam(xhtml, result, 'fio', /<span[^>]+class="b2c.header.greeting.pre.b2c.ban"[^>]*>([\s\S]*?)(?:<\/span>|,)/i, replaceTagsAndSpaces, html_entity_decode);*/
		// Пробуем получить со страницы, при обновлении через мобильный интернет, он там есть
		getParam(html, result, 'balance', /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, replaceTagsAndSpaces, parseBalance);
		// Теперь запросим блок homeBalance
		xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'homeBalance');
		/*var tries = 0; //Почему-то не работает. Сколько раз ни пробовал, если первый раз баланс недоступен, то и остальные оказывается недоступен...
		while(/balance-not-found/i.test(xhtml) && tries < 20){
			AnyBalance.trace('Баланс временно недоступен, пробуем обновить: ' + (++tries));
			AnyBalance.sleep(2000);
			xhtml = refreshBalance(baseurl + 'c/pre/index.html', html, xhtml) || xhtml;
		} */
		// И получим баланс из него
		getParam(xhtml, result, 'balance', /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, replaceTagsAndSpaces, parseBalance);
		// Если баланса нет, не надо получать и валюту
		if(!isset(result.balance)) {
			getParam(xhtml, result, ['currency', 'balance'], /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, replaceTagsAndSpaces, myParseCurrency);
		}
	}
	if (isAvailableBonuses()) {
		xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'bonusesForm homeServices')
		getBonuses(xhtml, result);
	}
	if (AnyBalance.isAvailable('fio')) {
		AnyBalance.trace('Переходим в мобильную версию для получения ФИО.');
		
		html = AnyBalance.requestGet(baseurl + 'm/pre/index.html', g_headers);
		AnyBalance.trace(html);
		
		if(/Вход в личный кабинет/i.test(html)) {
			AnyBalance.trace('Перейти в мобильную версию не удалось, попробуем зайти с логином и паролем...');
			
			html = AnyBalance.requestGet(baseurl + 'ext/mAuthorization.html?ret_url=https%3A%2F%2Fmy.beeline.ru%2FmLogin.html&login=' + encodeURIComponent(prefs.login) + '&password=' + encodeURIComponent(prefs.password), g_headers);
			html = AnyBalance.requestGet(baseurl + 'm/pre/index.html', g_headers);
		}
		getParam(html, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLenttersAndDecode);
		// Если не получили баланс выше, попробуем достать его из мобильной версии
		// Вызывает глюки, надо дождаться логов, из них будет ясно что тут отображается, если в кабинете нет баланса.
		/*if(result.balance == null) {
			getParam(html, result, 'balance', /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, ['currency', 'balance'], /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, replaceTagsAndSpaces, myParseCurrency);
		}*/
	}
	
	AnyBalance.setResult(result);
}

function isAvailableBonuses() {
	return AnyBalance.isAvailable('sms_left', 'mms_left', 'rub_bonus', 'rub_opros', 'min_local', 'min_bi', 'min_local_clear');
}

function getBonuses(xhtml, result) {
	var bonuses = sumParam(xhtml, null, null, /<div[^>]+class="item(?:[\s\S](?!$|<div[^>]+class="item))*[\s\S]/ig);
	
	AnyBalance.trace("Found " + bonuses.length + ' aggregated bonuses');
	for (var j = 0; j < bonuses.length; ++j) {
		var bonus = bonuses[j];
		var bonus_name = ''; //getParam(bonus, null, null, /<span[^>]+class="bonuses-accums-list"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
													// Эта регулярка вроде не работает, но оставил для совместимости
		var services = sumParam(bonus, null, null, /<div[^>]+class="(?:accumulator|bonus)"(?:[\s\S](?!$|<div[^>]+class="(?:accumulator|bonus)"))*[\s\S]/ig);
		AnyBalance.trace("Found " + services.length + ' bonuses');
		var reValue = /<div[^>]+class="column2[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
		var reNewValue = /<div[^>]+class="column2[^"]*"(?:[^>]*>){5}([\s\d,]+)/i;
		
		for (var i = 0; i < services.length; ++i) {
			var name = '' + getParam(services[i], null, null, /<div[^>]+class="column1[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode); //+ ' ' + bonus_name;
			if (/SMS|штук/i.test(name)) {
				sumParam(services[i], result, 'sms_left', [reValue, reNewValue], replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/MMS/i.test(name)) {
				sumParam(services[i], result, 'mms_left', [reValue, reNewValue], replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Internet|Интернет/i.test(name)) {
				// Для опции Хайвей все отличается..
				if (/Xайвей|Интернет-трафика по тарифу/i.test(name)) {
					sumParam(services[i], result, 'traffic_left', /<div[^>]+class="column2[^"]*"([^>]*>){6}/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					sumParam(services[i], result, 'traffic_total', /<div[^>]+class="column2[^"]*"(?:[^>]*>){5}[^<]*из([\s\d,]*ГБ)/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					if(isset(result.traffic_left) && isset(result.traffic_total)) {
						sumParam(result.traffic_total - result.traffic_left, result, 'traffic_used', null, null, null, aggregate_sum);
					}
				} else {
					sumParam(services[i], result, 'traffic_left', reValue, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				}
			} else if (/Рублей БОНУС|бонус-баланс/i.test(name)) {
				sumParam(services[i], result, 'rub_bonus', reValue, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Рублей за участие в опросе|Счастливое время/i.test(name)) {
				sumParam(services[i], result, 'rub_opros', reValue, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Времени общения/i.test(name)) {
				sumParam(services[i], result, 'min_local', reValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/Секунд БОНУС\s*\+|Баланс бонус-секунд/i.test(name)) {
				sumParam(services[i], result, 'min_bi', reValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/Секунд БОНУС-2|Баланс бесплатных секунд-промо/i.test(name)) {
				sumParam(services[i], result, 'min_local', reValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/минут в месяц|мин\./i.test(name)) {
				var minutes = getParam(services[i], null, null, reValue, replaceTagsAndSpaces, parseMinutes);
				sumParam(minutes, result, 'min_local', null, null, null, aggregate_sum);
				sumParam(minutes/60, result, 'min_local_clear', null, null, null, aggregate_sum);
			} else if (/Минут общения по тарифу/i.test(name)) {
				// Это новый вид отображения данных
				// Минут осталось
				sumParam(services[i], result, 'min_local', reNewValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				
			} else {
				AnyBalance.trace('Неизвестная опция: ' + bonus_name + ' ' + services[i]);
			}
		}
	}
}

/*function parseBalanceMins(str){
    var re = /(?:(\d+)\s*час\D*)?(?:(\d+)\s*мин\D*)?(?:(\d+)\s*сек)?/i;
    var matches = str.match(re);
    if(matches && (matches[1] || matches[2] || matches[3])){
        var secs = (matches[1] || 0)*3600 + (matches[2] || 0)*60 + (matches[3] || 0)*1;
        AnyBalance.trace('Parsed ' + secs + 'seconds from ' + str);
        return secs;
    }

    return parseBalance(str);
}*/

function getBonusesPost(xhtml, result) {
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
			} else if (/Internet|Интернет|Мб в месяц/i.test(name)) {
				sumParam(services[i], result, 'traffic_left', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^([\d\s.,]+)$/, '$1 MB'], parseTraffic, aggregate_sum);
			} else if (/Рублей БОНУС|бонус-баланс/i.test(name)) {
				sumParam(services[i], result, 'rub_bonus', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Рублей за участие в опросе|Счастливое время/i.test(name)) {
				sumParam(services[i], result, 'rub_opros', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Времени общения/i.test(name)) {
				sumParam(services[i], result, 'min_local', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/Секунд БОНУС\s*\+|Баланс бонус-секунд/i.test(name)) {
				sumParam(services[i], result, 'min_bi', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/Секунд БОНУС-2|Баланс бесплатных секунд-промо/i.test(name)) {
				sumParam(services[i], result, 'min_local', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/минут в месяц|мин\./i.test(name)) {
				var minutes = getParam(services[i], null, null, /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes);
				sumParam(minutes, result, 'min_local', null, null, null, aggregate_sum);
				sumParam(minutes/60, result, 'min_local_clear', null, null, null, aggregate_sum);
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