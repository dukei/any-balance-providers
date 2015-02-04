/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Для отладки в дебагере: параметр __debug
Значения: pre - предоплата, post - постоплата, b2b - кабинет для юр. лиц.
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

var g_currencys = {
	руб: 'р',
	RUR: 'р',
	тенге:'₸',
	undefined: ''
}

function getBlock(url, html, name, exact, onlyReturnParams) {
	var formhtml = html;
	if (isArray(html)) { //Если массив, то разный хтмл для поиска блока и для формы
		formhtml = html[1];
		html = html[0];
	}
	
	var re = new RegExp("PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*u:\\s*'" + (exact ? "" : "[^']*") + name);
	var data = getParam(html, null, null, re);
	if (!data) {
		AnyBalance.trace('Блок ' + name + ' не найден!');
		return '';
	}

	var formId = getParam(data, null, null, /f:\s*'([^']*)/, replaceSlashes);
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
	var source = getParam(data, null, null, /s:\s*'([^']*)/, replaceSlashes);
	var render = getParam(data, null, null, /u:\s*'([^']*)/, replaceSlashes);

	params['javax.faces.partial.ajax'] = true;
	params['javax.faces.source'] = source;
	params['javax.faces.partial.execute'] = '@all';
	params['javax.faces.partial.render'] = render;
	//params[render] = render;
	params[source] = source;
	
	if(!onlyReturnParams) {
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
	} else {
		return params;
	}
}

function refreshBalance(url, html, htmlBalance) {
	//var data = getParam(htmlBalance, null, null, /PrimeFaces\.\w+\s*\(\s*\{[^}]*update:\s*'[^']*headerBalance/);
	var data = getParam(html, null, null, /PrimeFaces\.\w+\s*[^}]*(?:header|home)Balance/i);
	
	if (!data) {
		AnyBalance.trace('Блок headerBalance не найден!');
		return '';
	}
	
	var form = getParam(html, null, null, /<form[^>]*action="(?:[^>]*>){3}\s*loadingBalance[\s\S]*?<\/form>/i)
	if (!form) {
		AnyBalance.trace('Не найдена форма для блока (?:header|home)Balance!');
		return '';
	}
	
	var source = getParam(form, null, null, /s:\s*["']([^"']+)/i, replaceSlashes);
	var render = getParam(data, null, null, /(?:u|block):\s*["']([^"']+)/i, replaceSlashes);
	
	var viewState = getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]+)/i, null, html_entity_decode);
	
	//var formId = getParam(form, null, null, /id="([^"]*)/i, null, html_entity_decode);
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
	data = getParam(html, null, null, new RegExp('<update[^>]+id="' + render + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i'));
	if (!data) {
		AnyBalance.trace('Неверный ответ для блока headerBalance: ' + html);
		return '';
	}
	return data;
}

function getBonusesBlock(url, html, name, exact, onlyReturnParams) {
	var formhtml = html;
	if (isArray(html)) { //Если массив, то разный хтмл для поиска блока и для формы
		formhtml = html[1];
		html = html[0];
	}

	var prefs = AnyBalance.getPreferences();
	if (prefs.country == 'kz')
		var re = new RegExp("loadingServices = function\\(\\) \\{PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*update:\\s*'" + (exact ? "" : "[^']*") + name);
	else
		var re = new RegExp("(?:loadingbonusesloaderDetails|loadingAccumulators)\\s*=\\s*function\\(\\) \\{PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*u:\\s*'" + (exact ? "" : "[^']*") + name);
	
	var data = getParam(html, null, null, re);
	if (!data) {
		AnyBalance.trace('Блок ' + name + ' не найден!');
		return '';
	}

	var formId = getParam(data, null, null, /f:\s*'([^']*)/, replaceSlashes);
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
	var source = getParam(data, null, null, /s:\s*'([^']*)/, replaceSlashes);
	var render = getParam(data, null, null, /u:\s*'([^']*)/, replaceSlashes);

	params['javax.faces.partial.ajax'] = true;
	params['javax.faces.source'] = source;
	params['javax.faces.partial.execute'] = '@all';
	params['javax.faces.partial.render'] = render;
	//params[render] = render;
	params[source] = source;
	
	if(!onlyReturnParams) {
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
	} else {
		return params;
	}
}

function myParseCurrency(text) {
	var val = html_entity_decode(text).replace(/\s+/g, '').replace(/[\-\d\.,]+/g, '');
	val = g_currencys[val];
	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	return val;
}

function checkCorrectNumberLogin(html, prefs) {
	var phone = getParam(html, null, null, [/"sso-number"[^>]*>([^<]*)/i, /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i], [/\D/g, '']);
	if(!phone)
		throw new AnyBalance.Error('Не удалось выяснить на какой номер мы залогинились, сайт изменен?');
	
	AnyBalance.trace('Судя по всему, мы уже залогинены на номер ' + phone);
	
	var needeedPhone = prefs.login;
	
	if(!endsWith(phone, needeedPhone)) {
		AnyBalance.trace('Залогинены на неправильный номер ' + phone + ' т.к. в настройках указано, что номер должен заканчиваться на ' + needeedPhone);
		throw new AnyBalance.Error('В настоящее время Билайн не поддерживает обновление чужого номера через мобильный интернет. Обновите этот аккаунт через Wi-Fi.');
	}
	AnyBalance.trace('Залогинены на правильный номер ' + phone);
}

function loginProc(baseurl, action, params, prefs) {
	var html;
	//Теперь, когда секретный параметр есть, можно попытаться войти
	try {
		html = AnyBalance.requestPost(baseurl + (action || 'login.xhtml'), params, addHeaders({Referer: baseurl + 'login.xhtml'}));
	} catch(e) {
		if(prefs.__debug) {
			if(prefs.__debug == 'b2b')
				html = AnyBalance.requestGet(baseurl + 'b/index.xhtml');
			else
				html = AnyBalance.requestGet(baseurl + 'c/' + prefs.__debug + '/index.html');
		} else {
			throw e;
		}
	}
	return html;
}

function isMultinumbersCabinet(html) {
	var accounts = sumParam(html, null, null, /selectAccount\('\d+'\);/ig);
	return accounts.length > 1;
}

function canUseMobileApp(prefs){
	return (!prefs.phone || prefs.phone == prefs.login) && /^\d{10}$/.test(prefs.login);
}

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://my.beeline.' + (prefs.country || 'ru') + '/';
	
	if(prefs.country == 'kz') {
		AnyBalance.setCookie('my.beeline.kz', 'ui.language.current', 'ru_RU');
	} else {
		if(prefs.source == 'app') {
			if(canUseMobileApp(prefs)) {
				proceedWithMobileAppAPI(baseurl, prefs);
				return;
			} else {
				AnyBalance.trace('Невозможно обновить данные через API мобильного приложения, пробуем войти через сайт...');
			}
		}
	}
	
	try {
		if(prefs.country == 'kz')
			proceedWithSiteKz(baseurl, prefs);
		else
			proceedWithSite(baseurl, prefs);
	} catch(e){
		if(e.fatal)
			throw e;
		//Обломался сайт. Если можно мобильное приложение, давайте его попробуем
		if(canUseMobileApp(prefs)) {
			AnyBalance.trace('Не получается зайти в личный кабинет: ' + e.message + '. Попробуем мобильное приложение');
			proceedWithMobileAppAPI(baseurl, prefs, true);
			return;
		}else{
			throw e;
		}
	}
}

function proceedWithSite(baseurl, prefs) {
	try {
		var html = AnyBalance.requestGet(baseurl + 'login.xhtml', g_headers);
		
		if (AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
			throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
		}
		
		if(/xbr.x?html/i.test(AnyBalance.getLastUrl())) {
			AnyBalance.trace('Переадресовались на xbr.xhtml');
			AnyBalance.setCookie('my.beeline.ru', 'token', 'invalid');
			
			// Эдакий хак, чтобы перейти на страницу авторизации
			html = AnyBalance.requestPost(baseurl + 'login.xhtml', {
				'selectLk':'1',
				'login':prefs.login,
				'password':prefs.password
			}, addHeaders({Referer: 'http://my.beeline.ru/xbr.xhtml'}));
		}
	} catch(e){
		if(!prefs.__debug)
			throw e;
	}
	
	if(prefs.__debug) {
		try {
			if(prefs.__debug == 'b2b') {
				html = AnyBalance.requestGet(baseurl + 'b/index.xhtml', g_headers);
			} else {
				html = AnyBalance.requestGet(baseurl + 'c/' + prefs.__debug + '/index.xhtml', g_headers);
			}
		} catch(e){
		}
	}
	
	// AnyBalance.trace('Запрашиваем login.html');
	// AnyBalance.trace(html);
	
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
		for(var i = 1 ; i < 6; i++) {
			var html = loginProc(baseurl, action, params, prefs);
			// Если нет показывают ошибки входа, надо попробовать еще раз
			if(/Вход в личный кабинет/i.test(html) && !/<span[^>]+class="ui-messages-error-summary"/i.test(html)) {
				AnyBalance.trace('Войти не удалось, сайт не сообщает ни о каких ошибках, попытка №' + i);
				continue;
			} else {
				AnyBalance.trace('Выполнили ' + i + ' попыток входа..');
				break;
			}
		}
	}
	// Иногда билайн нормальный пароль считает временным и предлагает его изменить, но если сделать еще один запрос, пускает и показывает баланс
	if (/Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html)) {
		AnyBalance.trace('Билайн считает наш пароль временным, но это может быть и не так, попробуем еще раз войти...');
		html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({Referer: baseurl + 'login.html'}));
	}
	// Ну и тут еще раз проверяем, получилось-таки войти или нет
	if (/<form[^>]+name="(?:chPassForm)"|Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html))
		throw new AnyBalance.Error('Вы зашли по временному паролю, требуется сменить пароль. Для этого войдите в ваш кабинет ' + baseurl + ' через браузер и смените там пароль. Новый пароль введите в настройки данного провайдера.', null, true);
	if (/<form[^>]+action="\/(?:changePass|changePassB2C).html"/i.test(html))
		throw new AnyBalance.Error('Билайн требует сменить пароль. Зайдите в кабинет ' + baseurl + ' через браузер и поменяйте пароль на постоянный.', null, true);
	
	// Определим, может мы вошли в кабинет для юр. лиц?
	if (/b\/logout.xhtml/i.test(html)) {
		fetchB2B(baseurl, html);
	} else {
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
			
			var message = getParam(html, null, null, /<h1>\s*(Личный кабинет временно недоступен\s*<\/h1>[\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			if(message)
				throw new AnyBalance.Error(message);
			//Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		if (/'b2c',\s*'postpaid'/i.test(html)) {
			fetchPost(baseurl, html);
		} else {
			fetchPre(baseurl, html);
		}
	}
}

function parseBalanceNegative(str) {
	var val = parseBalance(str);
	if (isset(val))
		return -val;
}

function fetchB2B(baseurl, html) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в кабинете для юр. лиц...');
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /"user-name"([^>]*>){2}/i, replaceTagsAndSpaces, capitalFirstLetters);
    if (AnyBalance.isAvailable('balance', 'agreement', 'currency', 'overpay')) {
    	var accounts = sumParam(html, null, null, /b\/info\/contractDetail\.xhtml\?objId=\d+[^>]*>\d{5,10}/ig);
		
		if(!accounts || accounts.length < 1) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти ни одного договора, сайт изменен, либо проблемы на сайте.');
		}
		
    	AnyBalance.trace('Договоров: ' + accounts.length);
    	// Пока мы не знаем как будет выглядеть кабинет с двумя и более договорами, пока получим по первому
    	var current = accounts[0];
    	var currentNum = getParam(current, null, null, />(\d+)/);
    	var currentId = getParam(current, null, null, /b\/info\/contractDetail\.xhtml\?objId=(\d+)/i);
    	var currentHref = getParam(current, null, null, /b\/info\/contractDetail\.xhtml\?objId=\d+/i);
		
    	AnyBalance.trace('Получим информацию по договору: ' + currentNum);
		
    	html = AnyBalance.requestGet(baseurl + currentHref, g_headers);
		
    	getParam(html, result, 'agreement', /Договор №([\s\d]+)/i, replaceTagsAndSpaces);
		// Неизвестно что и как выводить, пока сделаем так, может нужно будет переделать
    	getParam(html, result, 'balance', /class="balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Сумма неоплаченных счетов[^\d]+/i, '-'], parseBalance);
		getParam(html, result, 'overpay', /class="[^>]*balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Сумма неоплаченных счетов[^\d]+/i, '-'], parseBalance);
    	getParam(html, result, ['currency', 'balance'], /class="balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /все счета оплачены/, '', /[.,]/g, ''], parseCurrency);
	}
	//Получим страницу с тарифом и опциями
    html = AnyBalance.requestGet(baseurl + 'b/info/abonents/catalog.xhtml', g_headers);
	
    var number = prefs.phone || '\\d{4}';
	
	// Если указан телефон, надо его найти, актуально для тех у кого больше 10 номеров, они не помещаются на странице
	if(prefs.phone) {
		var form = getParam(html, null, null, /<form[^>]*id="mobileDataForm"[\s\S]*?<\/form>/i);
		
		checkEmpty(form, 'Не удалось найти форму поиска номера, сайт изменен?', true);
		
		var params = getBlock(' ', html, 'mobileDataForm', 'mobileDataForm', true);
		
		params['mobileDataForm:abonents:telephoneNum'] = prefs.phone;
		params['javax.faces.partial.execute'] = 'mobileDataForm';
		
		html = AnyBalance.requestPost(baseurl + 'b/info/abonents/catalog.xhtml', params, addHeaders({
			Referer: baseurl + 'b/info/abonents/catalog.xhtml',
			'Faces-Request': 'partial/ajax',
			'X-Requested-With': 'XMLHttpRequest'
		}));

		var re = new RegExp('<update[^>]*id="mobileDataForm"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i');
		data = getParam(html, null, null, re);
		if (!data) {
			AnyBalance.trace('Неверный ответ для блока mobileDataForm: ' + html);
			html = '';
		} else {
			html = data;
		}
	}
	
    var href = getParam(html, null, null, new RegExp('(b/info/subscriberDetail\\.xhtml\\?objId=\\d+)(?:[^>]*>){4}\\d{4,6}' + number, 'i'));
	
    checkEmpty(href, 'Не удалось найти ' + (prefs.phone ? 'номер с последними цифрами ' + prefs.phone : 'ни одного номера!'), true);
    
	html = AnyBalance.requestGet(baseurl + href, g_headers);
    
	getParam(html, result, 'phone', /subheader\s*"([^>]*>){3}/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тариф:([^>]*>){5}/i, replaceTagsAndSpaces);


	// Трафик из детализации, пока не работает
	// if(isAvailable()) {
		// var form = getParam(html, null, null, /<form id="reportDetailUnbilledButtonsForm"[\s\S]*?<\/form>/i);
		// if(form) {
			// var xhtml = getBlock(baseurl + 'faces/info/subscriberDetail.html', form, 'reportDetailUnbilledButtonsForm', 'reportDetailUnbilledButtonsForm');
			
			// var params = getBlock(baseurl + 'faces/info/subscriberDetail.html', xhtml, 'reportDetailUnbilledButtonsForm', 'reportDetailUnbilledButtonsForm', true);
			
			// params['javax.faces.partial.render'] = 'reportDetailUnbilledButtonsForm messages reportDetailUnbilledExcelButtonForm:excelDetailOnlineButton';
			
			// html = AnyBalance.requestPost(baseurl + 'faces/info/subscriberDetail.html', params, addHeaders({
				// Referer: baseurl + href,
				// 'Faces-Request': 'partial/ajax',
				// 'X-Requested-With': 'XMLHttpRequest'
			// }));
		// }
	// }
	
	// Это расходы из детализации
	if(isAvailable('balance')) {
		var form = getParam(html, null, null, /<form id="reportDetailUnbilledButtonsForm"[\s\S]*?<\/form>/i);
		if(form) {
			/*
			javax.faces.partial.ajax:true
			javax.faces.source:reportDetailUnbilledButtonsForm:j_idt2444
			javax.faces.partial.execute:@all
			javax.faces.partial.render:messages reportDetailUnbilledForm reportDetailUnbilledExcelButtonForm:excelDetailOnlineButton unbilledConfirDlg
			reportDetailUnbilledButtonsForm:j_idt2444:reportDetailUnbilledButtonsForm:j_idt2444
			reportDetailUnbilledButtonsForm:reportDetailUnbilledButtonsForm
			javax.faces.ViewState:-2522423474342426299:3960040617829553771		
			*/
			
			// var xhtml = getBlock(baseurl + 'b/info/subscriberDetail.xhtml', form, 'reportDetailUnbilledButtonsForm');
			
			// var params = getBlock(baseurl + 'b/info/subscriberDetail.xhtml', xhtml, 'reportDetailUnbilledButtonsForm', 'reportDetailUnbilledButtonsForm', true);
			
			// params['javax.faces.partial.render'] = 'reportDetailUnbilledButtonsForm messages reportDetailUnbilledExcelButtonForm:excelDetailOnlineButton';
			
			// html = AnyBalance.requestPost(baseurl + 'b/info/subscriberDetail.xhtml', params, addHeaders({
				// Referer: baseurl + href,
				// 'Faces-Request': 'partial/ajax',
				// 'X-Requested-With': 'XMLHttpRequest'
			// }));
			
			//Итого с НДС[^>]*>([\s\S]*?)<\/div>
		}
	}
	
	
	
	
    // Бонусы
    var bonuses = sumParam(html, null, null, /class="accumulator"[^>]*>([\s\S]*?)<\/div/ig);
	AnyBalance.trace('Найдено бонусов и пакетов: ' + bonuses.length);
	
    for (var i = 0; i < bonuses.length; i++) {
    	var curr = bonuses[i];
    	var name = getParam(curr, null, null, /([^<]*)</i);
    	var usedMin = getParam(curr, null, null, /израсходовано[^>]*>([\s\d.,]+мин)/i, replaceTagsAndSpaces, parseMinutes);
    	var totalMin = getParam(curr, null, null, /из доступных[^>]*>([\s\d.,]+мин)/i, replaceTagsAndSpaces, parseMinutes);
    	var usedSms = getParam(curr, null, null, /израсходовано[^>]*>([\s\d.,]+штук)/i, replaceTagsAndSpaces, parseBalance);
    	var totalSms = getParam(curr, null, null, /из доступных[^>]*>([\s\d.,]+штук)/i, replaceTagsAndSpaces, parseBalance);		
		
    	// Это пакет опций
    	if (/Ноль на Билайн/i.test(name) && isset(usedMin) && isset(totalMin)) {
   			sumParam(totalMin - usedMin, result, 'min_bi', null, null, null, aggregate_sum);
		// Это минуты
    	} else if (isset(usedMin) && isset(totalMin)) {
			if(!isset(result['min_left_1']) && !isset(result['min_left_2']))
				sumParam(totalMin - usedMin, result, 'min_left_1', null, null, null, aggregate_sum);
			else if(isset(result['min_left_1']) && !isset(result['min_left_2']))
				sumParam(totalMin - usedMin, result, 'min_left_2', null, null, null, aggregate_sum);
			else
				sumParam(totalMin - usedMin, result, 'min_local', null, null, null, aggregate_sum);
		// Это смс
		} else if (isset(usedSms) && isset(totalSms)) {
   			sumParam(totalSms - usedSms, result, 'sms_left', null, null, null, aggregate_sum);
		} else {
    		AnyBalance.trace('Неизвестная опция, либо неизвестные единицы измерений: ' + curr);
    	}
    }
	
	// Новое отображение данных
	if(bonuses.length == 0 ) {
		getBonuses(html, result);
	}
	
    setCountersToNull(result);
    AnyBalance.setResult(result);
}

function fetchPost(baseurl, html) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в постоплатном кабинете');
	
	var result = {success: true, balance: null, currency: null};
	var multi = /onclick\s*=\s*"\s*selectAccount\('\d{10}|<span[^>]+class="selected"[^>]*>/i.test(html), xhtml='';
	
	// Пытаемся исправить всякую ерунду в балансе и валюте
	var balancesReplaces = [replaceTagsAndSpaces, /информация[^<]*недоступна|недоступна|временно недоступен/ig, ''];
	
	getParam(html, result, 'agreement', /<h2[^>]*>\s*Договор №([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
//	xhtml = getBlock(baseurl + 'c/post/index.html', html, 'list-contents', true); //Это строка вообще приводила к созданию/отмене заявки на смену тарифного плана
//	getParam(xhtml, result, '__tariff', /<h2[^>]*>(?:[\s\S](?!<\/h2>))*?Текущий тариф([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<h2[^>]*>(?:[\s\S](?!<\/h2>))*?Текущий тариф([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /<div[^>]+class="ban-param name">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (!multi) {
		AnyBalance.trace('Похоже на кабинет с одним номером.');
	} else {
		AnyBalance.trace('Похоже на кабинет с несколькими номерами.');
		
		if (prefs.phone) { //Если задан номер, то надо сделать из него регулярное выражение
			if (!/^\d{4,10}$/.test(prefs.phone))
				throw new AnyBalance.Error('Введите от 4 до 10 последних цифр номера дополнительного телефона без пробелов и разделителей или не вводите ничего, чтобы получить информацию по первому номеру!', null, true);
			
			var cabinetType = 1;
			// Оказывается есть два типа кабинета с несколькими номерами..
			var regnumber = prefs.phone.replace(/(\d)/g, '$1[\\s\\-()]*');
			var re = new RegExp('(?:<a[^>]*>\\s*)?<span[^>]*>\\+7[0-9\\s\\-()]*' + regnumber + '</span>', 'i');
			var numinfo = getParam(html, null, null, re);
			// Пробуем второй тип кабинета
			if(!isset(numinfo)) {
				cabinetType = 2;
				re = new RegExp('div[^>]*(?:>)[^>]*onclick="\\s*selectAccount\\([\'\\"]\\d*' + prefs.phone + '[\'\\"][^>]*', 'i');
				numinfo = getParam(html, null, null, re);
				if (!numinfo)
					throw new AnyBalance.Error('Не найден присоединенный к договору номер телефона, оканчивающийся на ' + prefs.phone);
			}
			
			var num = getParam(numinfo, null, null, /selectAccount\('([^']*)/, replaceSlashes);
			if(!isset(num))
				num = getParam(numinfo, null, null, null, replaceTagsAndSpaces, html_entity_decode);
			
			checkEmpty(num, 'Не удалось найти номер на который необходимо переключиться, сайт изменен?', true);
			
			if (/sso-account-current|class="selected"/i.test(numinfo)) {
				AnyBalance.trace('Дополнительный номер ' + num + ' уже выбран');
			} else {
				AnyBalance.trace('Переключаемся на номер ' + num);
				
				if(cabinetType == 1) {
					var formid = getParam(numinfo, null, null, /addSubmitParam\('([^']*)/, replaceSlashes);
					var params = getParam(numinfo, null, null, /addSubmitParam\('[^']*',(\{.*?\})\)/, null, getJsonEval);
				} else {
					var formid = getParam(html, null, null, /changeUser\s*=[^<]*?(?:f|formId):["']([^"']+)/i, replaceSlashes);
					var source = getParam(html, null, null, /changeUser\s*=[^<]*?(?:s|source):["']([^"']+)/i, replaceSlashes);					
				}

				var form = getParam(html, null, null, new RegExp('<form[^>]+id="' + formid + '"[^>]*>([\\s\\S]*?)</form>', 'i'));
				if (!form) {
					AnyBalance.trace(numinfo);
					throw new AnyBalance.Error('Дополнительный номер ' + num + ' найден, но переключиться на него не удалось. Возможны изменения в личном кабинете...');
				}
				
				if(cabinetType == 1) {
					var fparams = createFormParams(form);
					params = joinObjects(fparams, params);
				} else {
					var fparams = createFormParams(form);
					params = joinObjects(fparams, {
						'javax.faces.partial.ajax':'true',
						'javax.faces.source':source,
						'javax.faces.partial.execute':'@all',
						newSsoLogin: num
					});
					params[source] = source;
				}
				
				try {
					html = AnyBalance.requestPost(baseurl + 'c/post/index.xhtml', params, addHeaders({Referer: baseurl + 'c/post/index.xhtml'}));
				} catch(e) {}
				/*if (AnyBalance.getLastStatusCode() > 400) {
					AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
					throw new AnyBalance.Error('Переключится на доп. номер не удолось из-за технических проблем в личном кабинете Билайн. Проверьте, что вы можете переключиться на доп. номер, зайдя в личный кабинет через браузер.');
				}*/
				// Бывает что к постоплатному кабинету привязан предоплатный номер, проверяем..
				if(/c\/pre\/index\.xhtml/i.test(html)) {
					AnyBalance.trace('Дополнительный номер ' + num + ' предоплатный, но привязан к постоплатному кабинету...');
					html = AnyBalance.requestGet(baseurl + 'c/pre/index.xhtml', g_headers);
					fetchPre(baseurl, html);
					return;
				} else {
					// Вроде помогает переход на главную
					html = AnyBalance.requestGet(baseurl + 'c/post/index.xhtml', g_headers);
				}
			}
		}
		//Если несколько номеров в кабинете, то почему-то баланс надо брать отсюда
		if (AnyBalance.isAvailable('balance', 'currency')) {
			xhtml = refreshBalance(baseurl + 'c/post/index.xhtml', html);
			//xhtml = getBlock(baseurl + 'c/post/index.html', html, 'homeBalance');
			
			getParam(xhtml + html, result, 'balance', /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, parseBalance);
			getParam(xhtml + html, result, ['currency', 'prebal', 'overpay', 'balance'], /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, myParseCurrency);
		}
	}
	
	getParam(html, result, ['phone', 'traffic_used'], /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (isAvailableBonuses()) {
		AnyBalance.trace('Запросим бонусы...');
		// Вот геморойщики!!
		xhtml = getBlock(baseurl + 'c/post/index.xhtml', html, 'loadingBonusesAndServicesDetails');
		// Теперь только бонусы станут видны
		xhtml = getBlock(baseurl + 'c/post/index.xhtml', [xhtml || html, html], 'bonusesloaderDetails');
		// Надо проверить, получили ли мы бонусы
		var bonuses = getFoundBonuses(xhtml);
		if(bonuses.length === 0) {
			// И если не получили - пробуем другие варианты
		}
		
		// // Корпоративная постоплата
		// xhtml += getBonusesBlock(baseurl + 'c/post/index.html', html, 'subscriberDetailsForm');
		// // Еще какая-то херь(
		// xhtml += getBonusesBlock(baseurl + 'c/post/index.html', html, 'bonuses');
		
		getBonuses(html + xhtml, result);
	}
	
    if (AnyBalance.isAvailable('overpay', 'prebal', 'currency')) {
    	xhtml = getBlock(baseurl + 'c/post/index.xhtml', html, 'callDetailsDetails');
		
    	getParam(xhtml, result, 'overpay', /<h4[^>]*>Переплата[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, balancesReplaces, parseBalance);
    	getParam(xhtml, result, 'overpay', /<h4[^>]*>Осталось к оплате[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, balancesReplaces, parseBalanceNegative);
    	getParam(xhtml, result, 'prebal', /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, parseBalance);
    	getParam(xhtml, result, ['currency', 'prebal', 'overpay', 'balance'], /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, myParseCurrency);
		
		AnyBalance.trace(xhtml);
		if(/информация[^<]*недоступна/i.test(xhtml))
			AnyBalance.trace('Информация временно недоступна на сайте Билайн, попробуйте позже');
    }
	
	// Билайн грохнул мобильную версию кабинета..
	// if (!multi && AnyBalance.isAvailable('fio', 'balance', 'currency')) {
		// //Это надо в конце, потому что после перехода на m/ куки, видимо, портится.
		// xhtml = AnyBalance.requestGet(baseurl + 'm/post/index.html', g_headers);
		// getParam(xhtml, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLetters);
		// // Вроде бы все хорошо, но: {"sms_left":3463,"min_local":24900,"balance":0,"phone":"+7 909 169-24-86","agreement":"248260674","__time":1385043751223,"fio":"Максим Крылов","overpay":619.07,"min_local_clear":415,"currency":"рубвмесяцОтключитьБудьвкурсе","__tariff":"«Всё включено L 2013»"}
		// getParam(xhtml, result, 'balance', /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, balancesReplaces, parseBalance);
		// // Если баланса нет, не надо получать и валюту
		// if(isset(result.balance)) {
			// getParam(xhtml, result, ['currency', 'balance'], /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, balancesReplaces, myParseCurrency);
		// }
	// }
	if (!multi && AnyBalance.isAvailable('balance', 'currency')) {
		xhtml = refreshBalance(baseurl + 'c/post/index.xhtml', html);
		
		getParam(xhtml + html, result, 'balance', [/class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i,], balancesReplaces, parseBalance);
		getParam(xhtml + html, result, ['currency', 'balance'], [/class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="[^>]*balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i,], balancesReplaces, myParseCurrency);
	}
	
	if(prefs.__debug){
		//Проверяем, не создалась ли лишняя заявка в процессе просмотра личного кабинета
        html = AnyBalance.requestGet(baseurl + 'c/operations/operationsHistory.xhtml');
        var last_time = getParam(html, null, null, /<span[^>]+class="date"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        AnyBalance.trace('Последняя заявка: ' + last_time);
    }
	
	// Получение трафика из детализации
	if(result.phone && isAvailable(['traffic_used'])) {
		var num = getParam(result.phone, null, null, null, [/\+\s*7([\s\d\-]{10,})/i, '$1', /\D/g, '']);
		
		AnyBalance.trace('Пробуем получить данные по трафику из детализации по номеру: ' + num);
		html = AnyBalance.requestGet(baseurl + 'c/post/fininfo/report/detailUnbilledCalls.xhtml?ctn=' + num, g_headers);
		xhtml = getBlock(baseurl + 'c/post/fininfo/report/detailUnbilledCalls.xhtml', html, 'retrieveSubCurPeriodDataDetails');
		
		getParam(xhtml, result, 'traffic_used', /Итоговый объем данных \(MB\):([^>]*>){3}/i, [replaceTagsAndSpaces, /([\s\S]*?)/, '$1 мб'], parseTraffic);
	}
	
	// Получение суммы по всем номерам
	if(isAvailable(['total_balance'])) {
		AnyBalance.trace('Пробуем получить данные по сумме всех номеров...');
		
		html = AnyBalance.requestGet(baseurl + 'c/post/fininfo/index.xhtml', g_headers);
		
		getParam(html, result, 'total_balance', /Сумма по всем номерам(?:[\s\S]*?<th[^>]*>){11}([\s\S]*?)<\/span/i, null, parseBalance);
	}
	//Возвращаем результат
	setCountersToNull(result);
	AnyBalance.setResult(result);
}

function fetchPre(baseurl, html) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в предоплатном кабинете');
	
	var result = {success: true, balance: null, currency: null};
	
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
			var formid = getParam(html, null, null, /changeUser\s*=[^<]*?f:'([^']+)/, replaceSlashes);
			var source = getParam(html, null, null, /changeUser\s*=[^<]*?s:'([^']+)/, replaceSlashes);
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

			var xhtml = AnyBalance.requestPost(baseurl + 'c/pre/index.xhtml', params, addHeaders({Referer: baseurl + 'c/pre/index.xhtml'}));
			var url = getParam(xhtml, null, null, /<redirect[^>]+url="([^"]+)/i, null, html_entity_decode);
			if(!url)
				AnyBalance.trace('Не удалось переключить номер: ' + xhtml);
			else
				html = AnyBalance.requestGet(url, addHeaders({Referer: baseurl + 'c/pre/index.xhtml'}));
		}
	}
	getParam(html, result, 'phone', /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Текущий тариф[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

	var xhtml;
	if(prefs.country == 'kz' && !result.__tariff) {
		xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'currentTariffLoaderDetails');
		getParam(xhtml, result, '__tariff', [/<div[^>]+:tariffInfo[^>]*class="current"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, /<h2>(?:[\s\S](?!<\/h2>))*?Текущий тариф[^>]*>([\s\S]*?)\s*<\/h2>/i], replaceTagsAndSpaces, html_entity_decode);
	}
	
	if (AnyBalance.isAvailable('balance')) {
		// Если нет баланса, валюту не нужно получать
		function l_getCurrency() {
			if(isset(result.balance) && result.balance != null)
				getParam(html + xhtml, result, ['currency', 'balance'], balanceRegExp, replaceTagsAndSpaces, myParseCurrency);			
		}
		// Пробуем получить со страницы, при обновлении через мобильный интернет, он там есть
		var balanceRegExp = /<h3>[^>]*class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i;
		getParam(html, result, 'balance', balanceRegExp, replaceTagsAndSpaces, parseBalance);
		l_getCurrency();
		
		if(!isset(result.balance) || result.balance == null) {
			// Теперь запросим блок homeBalance
			//xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'loadingBalanceBlock');
			xhtml = refreshBalance(baseurl + 'c/pre/index.xhtml', html);
			/*var tries = 0; //Почему-то не работает. Сколько раз ни пробовал, если первый раз баланс недоступен, то и остальные оказывается недоступен...
			while(/balance-not-found/i.test(xhtml) && tries < 20){
				AnyBalance.trace('Баланс временно недоступен, пробуем обновить: ' + (++tries));
				AnyBalance.sleep(2000);
				xhtml = refreshBalance(baseurl + 'c/pre/index.html', html, xhtml) || xhtml;
			} */
			// И получим баланс из него
			getParam(xhtml, result, 'balance', balanceRegExp, replaceTagsAndSpaces, parseBalance);
			l_getCurrency();
		}
	}
	if (isAvailableBonuses()) {
		xhtml = getBonusesBlock(baseurl + 'c/pre/index.xhtml', html, 'bonusesForm');
		AnyBalance.trace(xhtml);
		// Затем надо пнуть систему, чтобы точно получить все бонусы
		//xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'refreshButton');
		getBonuses(xhtml, result);
	}
	if (AnyBalance.isAvailable('fio')) {
		AnyBalance.trace('Переходим в настройки для получения ФИО.');
		var href = getParam(html, null, null, /[^"]*settings.html/i);
		if(href) {
			if(!/http/i.test(href))
				href = baseurl.replace(/\/$/, '') + href;
			
			html = AnyBalance.requestGet(href, g_headers);
			
			getParam(html, result, 'fio', /personal_info(?:[^>]*>){5}[^>]*class="value"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, capitalFirstLetters);
			// А у некоторых ФИО не введен, поэтому и беда
			if(/\d{5,}/i.test(result.fio) || /^\s*$/i.test(result.fio)) {
				result.fio = undefined;
				AnyBalance.trace('ФИО еще не настроено в вашей анкете. Зайдите через браузер и перейдите на вкладку Настройки, в поле Имя и фамилия введите ваше ФИО.');
			}
		}
		// AnyBalance.trace('Переходим в мобильную версию для получения ФИО.');
		// html = AnyBalance.requestGet(baseurl + 'm/pre/index.html', g_headers);
		// AnyBalance.trace(html);
		
		// if(/Вход в личный кабинет/i.test(html)) {
			// AnyBalance.trace('Перейти в мобильную версию не удалось, попробуем зайти с логином и паролем...');
			
			// html = AnyBalance.requestGet(baseurl + 'ext/mAuthorization.html?ret_url=https%3A%2F%2Fmy.beeline.ru%2FmLogin.html&login=' + encodeURIComponent(prefs.login) + '&password=' + encodeURIComponent(prefs.password), g_headers);
			// html = AnyBalance.requestGet(baseurl + 'm/pre/index.html', g_headers);
		// }
		// getParam(html, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLetters);
	}
	
	setCountersToNull(result);
	AnyBalance.setResult(result);
}

function isAvailableBonuses() {
	return AnyBalance.isAvailable('sms_left', 'mms_left', 'rub_bonus', 'rub_opros', 'min_local', 'min_bi', 'traffic_left', 
		'traffic_used', 'traffic_total', 'min_left_1', 'min_left_2', 'rub_bonus2_till', 'rub_bonus2', 'min_local_till');
}

function getFoundBonuses(xhtml) {
	var bonuses = sumParam(xhtml, null, null, /<div[^>]+class="item(?:[\s\S](?!$|<div[^>]+class="item))*[\s\S]/ig);
	return bonuses;
}

function getBonuses(xhtml, result) {
	var bonuses = getFoundBonuses(xhtml);
	
	AnyBalance.trace("Found " + bonuses.length + ' aggregated bonuses');
	
	if(bonuses.length == 0) {
		AnyBalance.trace('Can`t find bonuses, tying to know why...');
		AnyBalance.trace(getParam(xhtml, null, null, /loading-failed"[^>]*>([^<]+)/i));
	}
	for (var j = 0; j < bonuses.length; ++j) {
		var bonus = bonuses[j];
		//var bonus_name = ''; //getParam(bonus, null, null, /<span[^>]+class="bonuses-accums-list"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		// var services = sumParam(bonus, null, null, /<div[^>]+class="\s*(?:accumulator|bonus|item)\s*"(?:[\s\S](?!$|<div[^>]+class="(?:accumulator|bonus|item)"))*[\s\S]/ig);
		var services = sumParam(bonus, null, null, /<div[^>]+class="\s*(?:(?:item\s*)?(?:accumulator|accumulator|bonus|item)?)[^"]*"(?:[\s\S](?!$|<div[^>]+class="(?:accumulator|accumulator|bonus|item)"))*[\s\S]/ig);
		
		AnyBalance.trace("Found " + services.length + ' bonuses');
		var reValue = /<div[^>]+class="[^>]*column2[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
		var reNewValue = /<div[^>]+class="[^>]*column2[^"]*"(?:[^>]*>){5}([\s\d,.]+)/i;
		
		for (var i = 0; i < services.length; ++i) {
			var name = '' + getParam(services[i], null, null, /<div[^>]+class="[^"]*column1[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode); //+ ' ' + bonus_name;
			var values = getParam(services[i], null, null, /<div class="val">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			var rest = getParam(services[i], null, null, /class="[^>]*rest"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			
			if (/Internet|Интернет/i.test(name)) {
				// Для опции Хайвей все отличается..
				// В билайне опечатались, первая буква иногда из русского алфавита, иногда из английского :)
				if (/(?:x|х)айвей|Интернет-трафик(?:а)?(?:\sна полной скорости)? по (?:услуге|тарифу)|Мобильного интернета|Мобильный интернет|Интернет\s*-?\s*трафик/i.test(name)) {
					AnyBalance.trace('Пробуем разобрать новый трафик...');
					AnyBalance.trace('services[i] = ' + services[i]);
					AnyBalance.trace('values = ' + values);
					AnyBalance.trace('rest = ' + rest);
					
					var units = getParam(values, null, null, /((?:K|К|G|Г|M|М)?(?:B|Б))/i);
					if(!units) {
						AnyBalance.trace('!units...');
						units = 'mb';
					}
					function parseTrafficMy(str) {
						return parseTraffic(str, units);
					}
					// Новое отображение пакета трафика
					if(rest) {
						sumParam(rest, result, 'traffic_left', null, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
					} else {
						sumParam(values, result, ['traffic_left', 'traffic_used'], /([^<]*)из/i, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
						sumParam(values, result, ['traffic_total', 'traffic_used'], /из([^<]*)/i, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
						if(isset(result.traffic_left) && isset(result.traffic_total)) {
							sumParam(result.traffic_total - result.traffic_left, result, 'traffic_used', null, null, null, aggregate_sum);
						}
					}

				} else {
					sumParam(services[i], result, 'traffic_left', reValue, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				}
			} else if (/SMS|СМС|штук/i.test(name)) {
				sumParam(services[i], result, 'sms_left', [reValue, reNewValue], replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/MMS/i.test(name)) {
				sumParam(services[i], result, 'mms_left', [reValue, reNewValue], replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Рублей БОНУС|бонус-баланс|Дополнительный баланс/i.test(name)) {
				sumParam(services[i], result, 'rub_bonus', reValue, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Денежный бонус/i.test(name)) {
				getParam(services[i], result, 'rub_bonus2', reValue, replaceTagsAndSpaces, parseBalance);
				getParam(services[i], result, 'rub_bonus2_till', /<div[^>]+class="column3[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateWord);
			} else if (/Рублей за участие в опросе|Счастливое время|Бонусы по программе|Счастливого времени/i.test(name)) {
				sumParam(services[i], result, 'rub_opros', reValue, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			} else if (/Времени общения|Включенные минуты/i.test(name)) {
				sumParam(services[i], result, 'min_local', [reValue, reNewValue], replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/Секунд БОНУС\s*\+|Баланс бонус-секунд/i.test(name)) {
				sumParam(services[i], result, 'min_bi', reValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if (/Секунд БОНУС-2|Баланс бесплатных секунд-промо/i.test(name)) {
				sumParam(services[i], result, 'min_left_1', reValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				sumParam(services[i], result, 'min_local_till', /Доступно до([^<]{10,20})/i, replaceTagsAndSpaces, parseDateWord, aggregate_min);
			} else if (/минут в месяц|мин\.|Голосовой трафик/i.test(name)) {
				var minutes = getParam(services[i], null, null, reValue, replaceTagsAndSpaces, parseMinutes);
				sumParam(minutes, result, 'min_local', null, null, null, aggregate_sum);
			// Это новый вид отображения данных
			} else if (/Минут общения по (?:тарифу|услуге)|вызовы/i.test(name)) {
				// Очень внимательно надо матчить
				if(/^Минут общения по тарифу$|других (?:сотовых\s+)?операторов|все номера|На номера домашнего региона|Минут общения по тарифу Все для бизнеса Бронза|кроме номеров "Билайн"/i.test(name))
					sumParam(services[i], result, 'min_local', reNewValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				else
					sumParam(services[i], result, 'min_bi', reNewValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				/*if(/на номера.+Билайн.+$/i.test(name))
					sumParam(services[i], result, 'min_bi', reNewValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				else 
					// Минут осталось на всех операторов
					sumParam(services[i], result, 'min_local', reNewValue, replaceTagsAndSpaces, parseMinutes, aggregate_sum);*/
			} else {
				AnyBalance.trace('Неизвестная опция: ' + name + ' ' + services[i]);
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
	var bonuses = sumParam(xhtml, null, null, [/<div[^>]+class="bonus-heading"[^>]*>[\s\S]*?<\/table>/ig, /<div[^>]+class="item(?:[\s\S](?!$|<div[^>]+class="item))*[\s\S]/ig]);
	for (var j = 0; j < bonuses.length; ++j) {
		var bonus = bonuses[j];
		var bonus_name = getParam(bonus, null, null, /<div[^>]+class="column\d+"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		//var services = sumParam(bonus, null, null, /<tr[^>]*>\s*<td[^>]+class="title"(?:[\s\S](?!<\/tr>))*?<td[^>]+class="value"[\s\S]*?<\/tr>/ig);
		
		var services = sumParam(bonus, null, null, /<div[^>]+class="\s*(?:accumulator|bonus|item)\s*"(?:[\s\S](?!$|<div[^>]+class="(?:accumulator|bonus|item)"))*[\s\S]/ig);
		AnyBalance.trace("Found " + services.length + ' bonuses');
		
		var reNewValue = /<div[^>]+class="column2[^"]*"(?:[^>]*>){5}([\s\d,]+)/i;		
		
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
				sumParam(services[i], result, 'min_left_1', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				sumParam(services[i], result, 'min_local_till', /Доступно до([^<]{10,20})/i, replaceTagsAndSpaces, parseDateWord, aggregate_min);
			} else if (/минут в месяц|мин\./i.test(name)) {
				var minutes = getParam(services[i], null, null, /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes);
				sumParam(minutes, result, 'min_local', null, null, null, aggregate_sum);
				//sumParam(minutes/60, result, 'min_local_clear', null, null, null, aggregate_sum);
			} else {
				AnyBalance.trace('Неизвестная опция: ' + bonus_name + ' ' + services[i]);
			}
		}
	}
}

/*
Бонусы различные
- Баланс SMS-промо: расходуются на SMS внутри России (Билайн и другие операторы);
- Баланс MMS-промо: расходуются на MMS внутри России (Билайн и другие операторы), на международных операторов и в роуминге не расходуются;
- Баланс Voice-промо: бесплатные секунды расходуются при звонках на все местные номера своего города подключения при условии нахождения Вас в пределах своей области подключения или безроуминговой зоне, если подключен "домашний регион" (в роуминге минуты не расходуются);
- Internet-баланс, Кб: баланс расходуется на весь GPRS-трафик при пользовании точками доступа internet.beeline.ru, home.beeline.ru, default.beeline.ru, в роуминге не расходуется.
Бонусы тратятся автоматически при использовании услуг сотовой связи.

*/
/** API Мобильного приложения */
function proceedWithMobileAppAPI(baseurl, prefs, failover) {
	AnyBalance.trace('Входим через API мобильного приложения...');
	baseurl +=  'api/1.0/';
	var encodedLogin = encodeURIComponent(prefs.login);
	var encodedPassword = encodeURIComponent(prefs.password);
	
	var json = callAPIProc(baseurl + 'auth?login=' + encodedLogin + '&password=' + encodedPassword);
	
	AnyBalance.setCookie('my.beeline.ru', 'token', json.token);
	
	json = callAPIProc(baseurl + 'info/payType?ctn=' + encodedLogin);
	
	var payType = json.payType;
	checkEmpty(payType, 'Не удалось узнать тип кабинета, сайт изменен?', true);
	AnyBalance.trace('Тип кабинета: ' + payType);
	
	json = callAPIProc(baseurl + 'info/pricePlan?ctn=' + encodedLogin);
	
	var result = {success: true};
	
	getParam(json.pricePlanInfo.entityName, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	
	// Предоплата
	if(payType == 'PREPAID') {
		json = callAPIProc(baseurl + 'info/prepaidBalance?ctn=' + encodedLogin);
		
		getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, apiParseBalanceRound);
		getParam(g_currencys[json.currency], result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	} else if(payType == 'POSTPAID') {
		
		json = callAPIProc(baseurl + 'info/postpaidBalance?ctn=' + encodedLogin);
		
		getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, apiParseBalanceRound);
		getParam(g_currencys[json.currency], result, ['currency', 'balance'], null, replaceTagsAndSpaces);	
	} else {
		throw new AnyBalance.Error('Неизвестный тип кабинета: ' + payType);
	}
	
	if(isAvailable('fio')) {
		json = callAPIProc(baseurl + 'sso/contactData?login=' + encodedLogin);
		
		if((isset(json.lastName) && /[A-Za-zА-Яа-я]{2,}/i.test(json.lastName)) && isset(json.firstName)) {
			getParam((json.lastName ? json.lastName + ' ' : '') + (json.firstName || ''), result, 'fio', null, replaceTagsAndSpaces);
		} else
			AnyBalance.trace('Фио не указано в настройках...');
	}
	// Номер телефона
	getParam(prefs.login, result, 'phone', /^\d{10}$/, [/(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2 $3 $4']);
	// Бонусы
	if(isAvailableBonuses()) {
		try {
			json = callAPIProc(baseurl + 'info/accumulators?ctn=' + encodedLogin);
	
			for(var z = 0; z < json.accumulators.length; z++) {
				var curr = json.accumulators[z];
				
				// Минуты
				if(curr.unit == 'SECONDS') {
					//Приоритет билайна не случаен, их минуты определить сложнее
					if(/номера других|на других|на все номера/i.test(curr.accName)) {
						sumParam(curr.rest + ' ' + curr.unit, result, 'min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					} else {
						sumParam(curr.rest + ' ' + curr.unit, result, 'min_bi', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					}
				} else if(curr.unit == 'SMS') {
					sumParam(curr.rest + ' ' + curr.unit, result, 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if(curr.unit == 'MMS') {
					sumParam(curr.rest + ' ' + curr.unit, result, 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if(curr.unit == 'KBYTE') {
					
					sumParam(curr.rest + ' ' + curr.unit, result, ['traffic_left', 'traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					sumParam(curr.size + ' ' + curr.unit, result, ['traffic_total', 'traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					
					if(isset(result.traffic_total) && isset(result.traffic_left)) {
						sumParam(result.traffic_total - result.traffic_left, result, 'traffic_used', null, null, null, aggregate_sum);
					}
				} else {
					AnyBalance.trace('Unknown units: ' + JSON.stringify(curr));
				}
			}
			
			if(payType == 'PREPAID') {
				json = callAPIProc(baseurl + 'info/prepaidAddBalance?ctn=' + encodedLogin);
				
				for(var prop in json){
					if(isArray(json[prop])){
						for(var i = 0; i < json[prop].length; i++) {
							var curr = json[prop][i];
							
							if(/bonusopros/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'rub_opros', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
							}else if(/bonusseconds/i.test(curr.name)) { //Бонус секунд-промо
								sumParam(curr.value + '', result, 'min_left_1', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
							}else if(/seconds/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'min_local', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
							}else if(/internet/i.test(curr.name)) {
								sumParam(curr.value + 'б', result, 'traffic_left', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
							}else if(/mms/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
							}else if(/sms/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
							}else{
								AnyBalance.trace('Unknown option: ' + prop + ' ' + JSON.stringify(curr));
							}
						}
					}
				}
			}
		} catch(e) {
			AnyBalance.trace('Ошибка получения бонусов: ' + e.message);
		}
	}

	if(failover)
		setCountersToNull(result);
	
	AnyBalance.setResult(result);
}

function setCountersToNull(result){
	var arr = AnyBalance.getAvailableCounters();
	for(var i=0; i<arr.length; ++i){
		if(arr[i] !== '--auto--' && !isset(result[arr[i]])){
			result[arr[i]] = null;
		}
	}
	if(!isset(result.__tariff))
		result.__tariff = null;
}


var errors = {
	AUTH_ERROR:' Ошибка авторизации! Проверьте логин-пароль!',

}

function callAPIProc(url) {
	var html = AnyBalance.requestGet(url, g_headers);
	var json = getJson(html);
	if(json.meta.status != 'OK')
		throw new AnyBalance.Error('Ошибка вызова API! ' + (errors[json.meta.message] || json.meta.message || '')) ;
	
	return json;
}

/** если не найдено число вернет null */
function apiParseBalanceRound(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return Math.round(balance*100)/100;
}

/************************************************************
** Для kz надо пока оставить старый механизм
*************************************************************/

function proceedWithSiteKz(baseurl, prefs) {
	try {
		var html = AnyBalance.requestGet(baseurl + 'login.html', g_headers);
		
		if (AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
			throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
		}
	} catch(e){
		if(!prefs.__debug)
			throw e;
	}
	
	if(prefs.__debug) {
		try {
			if(prefs.__debug == 'b2b') {
				html = AnyBalance.requestGet(baseurl + 'faces/index.html', g_headers);
			} else {
				html = AnyBalance.requestGet(baseurl + 'c/' + prefs.__debug + '/index.html', g_headers);
			}
		} catch(e){
		}
	}
	
	// AnyBalance.trace('Запрашиваем login.html');
	// AnyBalance.trace(html);
	
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
		for(var i = 1 ; i < 6; i++) {
			var html = loginProc(baseurl, action, params, prefs);
			// Если нет показывают ошибки входа, надо попробовать еще раз
			if(/Вход в личный кабинет/i.test(html) && !/<span[^>]+class="ui-messages-error-summary"/i.test(html)) {
				AnyBalance.trace('Войти не удалось, сайт не сообщает ни о каких ошибках, попытка №' + i);
				continue;
			} else {
				AnyBalance.trace('Выполнили ' + i + ' попыток входа..');
				break;
			}
		}
	}
	// Иногда билайн нормальный пароль считает временным и предлагает его изменить, но если сделать еще один запрос, пускает и показывает баланс
	if (/Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html)) {
		AnyBalance.trace('Билайн считает наш пароль временным, но это может быть и не так, попробуем еще раз войти...');
		html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({Referer: baseurl + 'login.html'}));
	}
	// Ну и тут еще раз проверяем, получилось-таки войти или нет
	if (/<form[^>]+name="(?:chPassForm)"|Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html))
		throw new AnyBalance.Error('Вы зашли по временному паролю, требуется сменить пароль. Для этого войдите в ваш кабинет ' + baseurl + ' через браузер и смените там пароль. Новый пароль введите в настройки данного провайдера.', null, true);
	if (/<form[^>]+action="\/(?:changePass|changePassB2C).html"/i.test(html))
		throw new AnyBalance.Error('Билайн требует сменить пароль. Зайдите в кабинет ' + baseurl + ' через браузер и поменяйте пароль на постоянный.', null, true);
	
	// Определим, может мы вошли в кабинет для физ лиц?
	if (/"logout-button"/i.test(html)) {
		fetchB2BKz(baseurl, html);
	} else {
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
			
			var message = getParam(html, null, null, /<h1>\s*(Личный кабинет временно недоступен\s*<\/h1>[\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			if(message)
				throw new AnyBalance.Error(message);
			//Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		if (/b2b_post/i.test(html)) {
			fetchPostKz(baseurl, html);
		} else {
			fetchPreKz(baseurl, html);
		}
	}
}

function fetchB2BKz(baseurl, html) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в кабинете для юр. лиц...');
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /"user-name"([^>]*>){2}/i, replaceTagsAndSpaces, capitalFirstLetters);
    if (AnyBalance.isAvailable('balance', 'agreement', 'currency')) {
    	var accounts = sumParam(html, null, null, /faces\/info\/contractDetail\.html\?objId=\d+[^>]*>\d{5,10}/ig);
		
		if(!accounts || accounts.length < 1) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти ни одного договора, сайт изменен, либо проблемы на сайте.');
		}
		
    	AnyBalance.trace('Договоров: ' + accounts.length);
    	// Пока мы не знаем как будет выглядеть кабинет с двумя и более договорами, пока получим по первому
    	var current = accounts[0];
    	var currentNum = getParam(current, null, null, />(\d+)/);
    	var currentId = getParam(current, null, null, /faces\/info\/contractDetail\.html\?objId=(\d+)/i);
    	var currentHref = getParam(current, null, null, /faces\/info\/contractDetail\.html\?objId=\d+/i);
		
    	AnyBalance.trace('Получим информацию по договору: ' + currentNum);
		
    	html = AnyBalance.requestGet(baseurl + currentHref, g_headers);
		
    	getParam(html, result, 'agreement', /Договор №([\s\d]+)/i, replaceTagsAndSpaces);
    	getParam(html, result, 'balance', /class="balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Сумма неоплаченных счетов[^\d]+/i, '-'], parseBalance);
    	getParam(html, result, ['currency', 'balance'], /class="balance"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /все счета оплачены/, '', /[.,]/g, ''], parseCurrency);
	}
	//Получим страницу с тарифом и опциями
    html = AnyBalance.requestGet(baseurl + 'faces/info/abonents/catalog.html', g_headers);
	
    var number = prefs.phone || '\\d{4}';
	
	// Если указан телефон, надо его найти, актуально для тех у кого больше 10 номеров, они не помещаются на странице
	if(prefs.phone) {
		var form = getParam(html, null, null, /<form[^>]*id="mobileDataForm"[\s\S]*?<\/form>/i);
		
		checkEmpty(form, 'Не удалось найти форму поиска номера, сайт изменен?', true);
		
		var params = getBlockKz(' ', html, 'mobileDataForm', 'mobileDataForm', true);
		
		params['mobileDataForm:abonents:telephoneNum'] = prefs.phone;
		params['javax.faces.partial.execute'] = 'mobileDataForm';
		
		html = AnyBalance.requestPost(baseurl + 'faces/info/abonents/catalog.html', params, addHeaders({
			Referer: baseurl + 'faces/info/abonents/catalog.html',
			'Faces-Request': 'partial/ajax',
			'X-Requested-With': 'XMLHttpRequest'
		}));

		var re = new RegExp('<update[^>]*id="mobileDataForm"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i');
		data = getParam(html, null, null, re);
		if (!data) {
			AnyBalance.trace('Неверный ответ для блока mobileDataForm: ' + html);
			html = '';
		} else {
			html = data;
		}
	}
	
    var href = getParam(html, null, null, new RegExp('(faces/info/subscriberDetail\\.html\\?objId=\\d+)(?:[^>]*>){4}\\d{4,6}' + number, 'i'));
	
    checkEmpty(href, 'Не удалось найти ' + (prefs.phone ? 'номер с последними цифрами ' + prefs.phone : 'ни одного номера!'), true);
    
	html = AnyBalance.requestGet(baseurl + href, g_headers);
    
	getParam(html, result, 'phone', /subheader\s*"([^>]*>){3}/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тариф:([^>]*>){5}/i, replaceTagsAndSpaces);
	// Трафик из детализации, пока не работает
	
	// if(isAvailable()) {
		// var form = getParam(html, null, null, /<form id="reportDetailUnbilledButtonsForm"[\s\S]*?<\/form>/i);
		// if(form) {
			// var xhtml = getBlockKz(baseurl + 'faces/info/subscriberDetail.html', form, 'reportDetailUnbilledButtonsForm', 'reportDetailUnbilledButtonsForm');
			
			// var params = getBlockKz(baseurl + 'faces/info/subscriberDetail.html', xhtml, 'reportDetailUnbilledButtonsForm', 'reportDetailUnbilledButtonsForm', true);
			
			// params['javax.faces.partial.render'] = 'reportDetailUnbilledButtonsForm messages reportDetailUnbilledExcelButtonForm:excelDetailOnlineButton';
			
			// html = AnyBalance.requestPost(baseurl + 'faces/info/subscriberDetail.html', params, addHeaders({
				// Referer: baseurl + href,
				// 'Faces-Request': 'partial/ajax',
				// 'X-Requested-With': 'XMLHttpRequest'
			// }));
		// }
	// }
	
    // Бонусы
    var bonuses = sumParam(html, null, null, /class="accumulator"[^>]*>([\s\S]*?)<\/div/ig);
	AnyBalance.trace('Найдено бонусов и пакетов: ' + bonuses.length);
	
    for (var i = 0; i < bonuses.length; i++) {
    	var curr = bonuses[i];
    	var name = getParam(curr, null, null, /([^<]*)</i);
    	var usedMin = getParam(curr, null, null, /израсходовано[^>]*>([\s\d.,]+мин)/i, replaceTagsAndSpaces, parseMinutes);
    	var totalMin = getParam(curr, null, null, /из доступных[^>]*>([\s\d.,]+мин)/i, replaceTagsAndSpaces, parseMinutes);
    	var usedSms = getParam(curr, null, null, /израсходовано[^>]*>([\s\d.,]+штук)/i, replaceTagsAndSpaces, parseBalance);
    	var totalSms = getParam(curr, null, null, /из доступных[^>]*>([\s\d.,]+штук)/i, replaceTagsAndSpaces, parseBalance);		
		
    	// Это пакет опций
    	if (/Ноль на Билайн/i.test(name) && isset(usedMin) && isset(totalMin)) {
   			sumParam(totalMin - usedMin, result, 'min_bi', null, null, null, aggregate_sum);
		// Это минуты
    	} else if (isset(usedMin) && isset(totalMin)) {
			if(!isset(result['min_left_1']) && !isset(result['min_left_2']))
				sumParam(totalMin - usedMin, result, 'min_left_1', null, null, null, aggregate_sum);
			else if(isset(result['min_left_1']) && !isset(result['min_left_2']))
				sumParam(totalMin - usedMin, result, 'min_left_2', null, null, null, aggregate_sum);
			else
				sumParam(totalMin - usedMin, result, 'min_local', null, null, null, aggregate_sum);
		// Это смс
		} else if (isset(usedSms) && isset(totalSms)) {
   			sumParam(totalSms - usedSms, result, 'sms_left', null, null, null, aggregate_sum);
		} else {
    		AnyBalance.trace('Неизвестная опция, либо неизвестные единицы измерений: ' + curr);
    	}
    }
	
	// Новое отображение данных
	if(bonuses.length == 0 ) {
		getBonuses(html, result);
	}
	
    setCountersToNull(result);
    AnyBalance.setResult(result);
}

function fetchPostKz(baseurl, html) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в постоплатном кабинете');
	
	var result = {success: true, balance: null, currency: null};
	var multi = /onclick\s*=\s*"\s*selectAccount\('\d{10}|<span[^>]+class="selected"[^>]*>/i.test(html), xhtml='';
	
	// Пытаемся исправить всякую ерунду в балансе и валюте
	var balancesReplaces = [replaceTagsAndSpaces, /информация[^<]*недоступна|недоступна|временно недоступен/ig, ''];
	
	getParam(html, result, 'agreement', /<h2[^>]*>\s*Договор №([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
//	xhtml = getBlockKz(baseurl + 'c/post/index.html', html, 'list-contents', true); //Это строка вообще приводила к созданию/отмене заявки на смену тарифного плана
//	getParam(xhtml, result, '__tariff', /<h2[^>]*>(?:[\s\S](?!<\/h2>))*?Текущий тариф([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<h2[^>]*>(?:[\s\S](?!<\/h2>))*?Текущий тариф([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /<div[^>]+class="ban-param name">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (!multi) {
		AnyBalance.trace('Похоже на кабинет с одним номером.');
	} else {
		AnyBalance.trace('Похоже на кабинет с несколькими номерами.');
		
		if (prefs.phone) { //Если задан номер, то надо сделать из него регулярное выражение
			if (!/^\d{4,10}$/.test(prefs.phone))
				throw new AnyBalance.Error('Введите от 4 до 10 последних цифр номера дополнительного телефона без пробелов и разделителей или не вводите ничего, чтобы получить информацию по первому номеру!', null, true);
			
			var cabinetType = 1;
			// Оказывается есть два типа кабинета с несколькими номерами..
			var regnumber = prefs.phone.replace(/(\d)/g, '$1[\\s\\-()]*');
			var re = new RegExp('(?:<a[^>]*>\\s*)?<span[^>]*>\\+7[0-9\\s\\-()]*' + regnumber + '</span>', 'i');
			var numinfo = getParam(html, null, null, re);
			// Пробуем второй тип кабинета
			if(!isset(numinfo)) {
				cabinetType = 2;
				re = new RegExp('div[^>]*(?:>)[^>]*onclick="\\s*selectAccount\\([\'\\"]\\d*' + prefs.phone + '[\'\\"][^>]*', 'i');
				numinfo = getParam(html, null, null, re);
				if (!numinfo)
					throw new AnyBalance.Error('Не найден присоединенный к договору номер телефона, оканчивающийся на ' + prefs.phone);
			}
			
			var num = getParam(numinfo, null, null, /selectAccount\('([^']*)/, replaceSlashes);
			if(!isset(num))
				num = getParam(numinfo, null, null, null, replaceTagsAndSpaces, html_entity_decode);
			
			checkEmpty(num, 'Не удалось найти номер на который необходимо переключиться, сайт изменен?', true);
			
			if (/sso-account-current|class="selected"/i.test(numinfo)) {
				AnyBalance.trace('Дополнительный номер ' + num + ' уже выбран');
			} else {
				AnyBalance.trace('Переключаемся на номер ' + num);
				
				if(cabinetType == 1) {
					var formid = getParam(numinfo, null, null, /addSubmitParam\('([^']*)/, replaceSlashes);
					var params = getParam(numinfo, null, null, /addSubmitParam\('[^']*',(\{.*?\})\)/, null, getJsonEval);
				} else {
					var formid = getParam(html, null, null, /changeUser\s*=[^<]*?formId:'([^']*)/, replaceSlashes);
					var source = getParam(html, null, null, /changeUser\s*=[^<]*?source:'([^']*)/, replaceSlashes);					
				}

				var form = getParam(html, null, null, new RegExp('<form[^>]+id="' + formid + '"[^>]*>([\\s\\S]*?)</form>', 'i'));
				if (!form) {
					AnyBalance.trace(numinfo);
					throw new AnyBalance.Error('Дополнительный номер ' + num + ' найден, но переключиться на него не удалось. Возможны изменения в личном кабинете...');
				}
				
				if(cabinetType == 1) {
					var fparams = createFormParams(form);
					params = joinObjects(fparams, params);
				} else {
					var fparams = createFormParams(form);
					params = joinObjects(fparams, {
						'javax.faces.partial.ajax':'true',
						'javax.faces.source':source,
						'javax.faces.partial.execute':'@all',
						newSsoLogin: num
					});
					params[source] = source;
				}
				
				try {
					html = AnyBalance.requestPost(baseurl + 'c/post/index.html', params, addHeaders({Referer: baseurl + 'c/post/index.html'}));
				} catch(e) {}
				/*if (AnyBalance.getLastStatusCode() > 400) {
					AnyBalance.trace('Beeline returned: ' + AnyBalance.getLastStatusString());
					throw new AnyBalance.Error('Переключится на доп. номер не удолось из-за технических проблем в личном кабинете Билайн. Проверьте, что вы можете переключиться на доп. номер, зайдя в личный кабинет через браузер.');
				}*/
				// Бывает что к постоплатному кабинету привязан предоплатный номер, проверяем..
				if(/c\/pre\/index\.html/i.test(html)) {
					AnyBalance.trace('Дополнительный номер ' + num + ' предоплатный, но привязан к постоплатному кабинету...');
					html = AnyBalance.requestGet(baseurl + 'c/pre/index.html', g_headers);
					fetchPre(baseurl, html);
					return;
				} else {
					// Вроде помогает переход на главную
					html = AnyBalance.requestGet(baseurl + 'c/post/index.html', g_headers);
				}
			}
		}
		//Если несколько номеров в кабинете, то почему-то баланс надо брать отсюда
		if (AnyBalance.isAvailable('balance', 'currency')) {
			xhtml = refreshBalanceKz(baseurl + 'c/post/index.html', html);
			//xhtml = getBlockKz(baseurl + 'c/post/index.html', html, 'homeBalance');
			
			getParam(xhtml + html, result, 'balance', /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, parseBalance);
			getParam(xhtml + html, result, ['currency', 'prebal', 'overpay', 'balance'], /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, myParseCurrency);
		}
	}
	
	getParam(html, result, ['phone', 'traffic_used'], /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (isAvailableBonuses()) {
		AnyBalance.trace('Запросим бонусы...');
		// Вот геморойщики!!
		xhtml = getBlockKz(baseurl + 'c/post/index.html', html, 'loadingBonusesAndServicesDetails');
		// Теперь только бонусы станут видны
		xhtml = getBlockKz(baseurl + 'c/post/index.html', [xhtml || html, html], 'bonusesloaderDetails');
		// Надо проверить, получили ли мы бонусы
		var bonuses = getFoundBonuses(xhtml);
		if(bonuses.length === 0) {
			// И если не получили - пробуем другие варианты
		}
		
		// // Корпоративная постоплата
		// xhtml += getBonusesBlockKz(baseurl + 'c/post/index.html', html, 'subscriberDetailsForm');
		// // Еще какая-то херь(
		// xhtml += getBonusesBlockKz(baseurl + 'c/post/index.html', html, 'bonuses');
		
		getBonuses(html + xhtml, result);
	}
	
    if (AnyBalance.isAvailable('overpay', 'prebal', 'currency')) {
    	xhtml = getBlockKz(baseurl + 'c/post/index.html', html, 'callDetailsDetails');
		
    	getParam(xhtml, result, 'overpay', /<h4[^>]*>Переплата[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, balancesReplaces, parseBalance);
    	getParam(xhtml, result, 'overpay', /<h4[^>]*>Осталось к оплате[\s\S]*?<span[^>]+class="price[^>]*>([\s\S]*?)<\/span>/i, balancesReplaces, parseBalanceNegative);
    	getParam(xhtml, result, 'prebal', /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, parseBalance);
    	getParam(xhtml, result, ['currency', 'prebal', 'overpay', 'balance'], /Расходы по договору за текущий период:[\S\s]*?<div[^<]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, balancesReplaces, myParseCurrency);
		
		AnyBalance.trace(xhtml);
		if(/информация[^<]*недоступна/i.test(xhtml))
			AnyBalance.trace('Информация временно недоступна на сайте Билайн, попробуйте позже');
    }
	
	// Билайн грохнул мобильную версию кабинета..
	// if (!multi && AnyBalance.isAvailable('fio', 'balance', 'currency')) {
		// //Это надо в конце, потому что после перехода на m/ куки, видимо, портится.
		// xhtml = AnyBalance.requestGet(baseurl + 'm/post/index.html', g_headers);
		// getParam(xhtml, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLetters);
		// // Вроде бы все хорошо, но: {"sms_left":3463,"min_local":24900,"balance":0,"phone":"+7 909 169-24-86","agreement":"248260674","__time":1385043751223,"fio":"Максим Крылов","overpay":619.07,"min_local_clear":415,"currency":"рубвмесяцОтключитьБудьвкурсе","__tariff":"«Всё включено L 2013»"}
		// getParam(xhtml, result, 'balance', /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, balancesReplaces, parseBalance);
		// // Если баланса нет, не надо получать и валюту
		// if(isset(result.balance)) {
			// getParam(xhtml, result, ['currency', 'balance'], /class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, balancesReplaces, myParseCurrency);
		// }
	// }
	if (!multi && AnyBalance.isAvailable('balance', 'currency')) {
		xhtml = refreshBalanceKz(baseurl + 'c/post/index.html', html);
		
		getParam(xhtml + html, result, 'balance', [/class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i,], balancesReplaces, parseBalance);
		getParam(xhtml + html, result, ['currency', 'balance'], [/class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i, /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i,], balancesReplaces, myParseCurrency);
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
		xhtml = getBlockKz(baseurl + 'c/post/fininfo/report/detailUnbilledCalls.html', html, 'retrieveSubCurPeriodDataDetails');
		
		getParam(xhtml, result, 'traffic_used', /Итоговый объем данных \(MB\):([^>]*>){3}/i, [replaceTagsAndSpaces, /([\s\S]*?)/, '$1 мб'], parseTraffic);
	}
	
	// Получение суммы по всем номерам
	if(isAvailable(['total_balance'])) {
		AnyBalance.trace('Пробуем получить данные по сумме всех номеров...');
		
		html = AnyBalance.requestGet(baseurl + 'c/post/fininfo/index.html', g_headers);
		
		getParam(html, result, 'total_balance', /Сумма по всем номерам(?:[^>]*>){59}([\s\d.,]+)/i, null, parseBalance);
	}
	//Возвращаем результат
    	setCountersToNull(result);
	AnyBalance.setResult(result);
}

function fetchPreKz(baseurl, html) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Мы в предоплатном кабинете');
	
	var result = {success: true, balance: null, currency: null};
	
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
	getParam(html, result, '__tariff', /Текущий тариф[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

	var xhtml;
	if(prefs.country == 'kz' && !result.__tariff) {
		xhtml = getBlockKz(baseurl + 'c/pre/index.html', html, 'currentTariffLoaderDetails');
		getParam(xhtml, result, '__tariff', [/<div[^>]+:tariffInfo[^>]*class="current"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, /<h2>(?:[\s\S](?!<\/h2>))*?Текущий тариф[^>]*>([\s\S]*?)\s*<\/h2>/i], replaceTagsAndSpaces, html_entity_decode);
	}
	
	if (AnyBalance.isAvailable('balance')) {
		// Если нет баланса, валюту не нужно получать
		function l_getCurrency() {
			if(isset(result.balance) && result.balance != null)
				getParam(html + xhtml, result, ['currency', 'balance'], balanceRegExp, replaceTagsAndSpaces, myParseCurrency);			
		}
		// Пробуем получить со страницы, при обновлении через мобильный интернет, он там есть
		var balanceRegExp = /<h3>[^>]*class="price[^>]*>((?:[\s\S]*?span[^>]*>){3})/i;
		getParam(html, result, 'balance', balanceRegExp, replaceTagsAndSpaces, parseBalance);
		l_getCurrency();
		
		if(!isset(result.balance) || result.balance == null) {
			// Теперь запросим блок homeBalance
			//xhtml = getBlockKz(baseurl + 'c/pre/index.html', html, 'loadingBalanceBlock');
			xhtml = refreshBalanceKz(baseurl + 'c/pre/index.html', html);
			/*var tries = 0; //Почему-то не работает. Сколько раз ни пробовал, если первый раз баланс недоступен, то и остальные оказывается недоступен...
			while(/balance-not-found/i.test(xhtml) && tries < 20){
				AnyBalance.trace('Баланс временно недоступен, пробуем обновить: ' + (++tries));
				AnyBalance.sleep(2000);
				xhtml = refreshBalanceKz(baseurl + 'c/pre/index.html', html, xhtml) || xhtml;
			} */
			// И получим баланс из него
			getParam(xhtml, result, 'balance', balanceRegExp, replaceTagsAndSpaces, parseBalance);
			l_getCurrency();
		}
	}
	if (isAvailableBonuses()) {
		xhtml = getBonusesBlockKz(baseurl + 'c/pre/index.html', html, 'bonusesForm');
		AnyBalance.trace(xhtml);
		// Затем надо пнуть систему, чтобы точно получить все бонусы
		//xhtml = getBlockKz(baseurl + 'c/pre/index.html', html, 'refreshButton');
		getBonuses(xhtml, result);
	}
	if (AnyBalance.isAvailable('fio')) {
		AnyBalance.trace('Переходим в настройки для получения ФИО.');
		var href = getParam(html, null, null, /[^"]*settings.html/i);
		if(!/http/i.test(href))
			href = baseurl.replace(/\/$/, '') + href;
		
		html = AnyBalance.requestGet(href, g_headers);
		
		getParam(html, result, 'fio', /personal_info(?:[^>]*>){5}[^>]*class="value"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, capitalFirstLetters);
		// А у некоторых ФИО не введен, поэтому и беда
		if(/\d{5,}/i.test(result.fio) || /^\s*$/i.test(result.fio)) {
			result.fio = undefined;
			AnyBalance.trace('ФИО еще не настроено в вашей анкете. Зайдите через браузер и перейдите на вкладку Настройки, в поле Имя и фамилия введите ваше ФИО.');
		}
		// AnyBalance.trace('Переходим в мобильную версию для получения ФИО.');
		// html = AnyBalance.requestGet(baseurl + 'm/pre/index.html', g_headers);
		// AnyBalance.trace(html);
		
		// if(/Вход в личный кабинет/i.test(html)) {
			// AnyBalance.trace('Перейти в мобильную версию не удалось, попробуем зайти с логином и паролем...');
			
			// html = AnyBalance.requestGet(baseurl + 'ext/mAuthorization.html?ret_url=https%3A%2F%2Fmy.beeline.ru%2FmLogin.html&login=' + encodeURIComponent(prefs.login) + '&password=' + encodeURIComponent(prefs.password), g_headers);
			// html = AnyBalance.requestGet(baseurl + 'm/pre/index.html', g_headers);
		// }
		// getParam(html, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLetters);
	}
	
    	setCountersToNull(result);
	AnyBalance.setResult(result);
}

function getBlockKz(url, html, name, exact, onlyReturnParams) {
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
	
	if(!onlyReturnParams) {
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
	} else {
		return params;
	}
}

function refreshBalanceKz(url, html, htmlBalance) {
	//var data = getParam(htmlBalance, null, null, /PrimeFaces\.\w+\s*\(\s*\{[^}]*update:\s*'[^']*headerBalance/);
	var data = getParam(html, null, null, /PrimeFaces\.\w+\s*[^}]*(?:header|home)Balance/i);
	
	if (!data) {
		AnyBalance.trace('Блок headerBalance не найден!');
		return '';
	}
	
	var form = getParam(html, null, null, /<form[^>]*action="(?:[^>]*>){3}\s*loadingBalance[\s\S]*?<\/form>/i)
	if (!form) {
		AnyBalance.trace('Не найдена форма для блока (?:header|home)Balance!');
		return '';
	}
	
	var source = getParam(form, null, null, /source:\s*'([^']*)/, replaceSlashes);
	var render = getParam(data, null, null, /(?:update|block):\s*'([^']*)/, replaceSlashes);
	
	var viewState = getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
	
	//var formId = getParam(form, null, null, /id="([^"]*)/i, null, html_entity_decode);
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
	data = getParam(html, null, null, new RegExp('<update[^>]+id="' + render + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i'));
	if (!data) {
		AnyBalance.trace('Неверный ответ для блока headerBalance: ' + html);
		return '';
	}
	return data;
}

function getBonusesBlockKz(url, html, name, exact, onlyReturnParams) {
	var formhtml = html;
	if (isArray(html)) { //Если массив, то разный хтмл для поиска блока и для формы
		formhtml = html[1];
		html = html[0];
	}

	var prefs = AnyBalance.getPreferences();
	//if (prefs.country == 'kz')
	//	var re = new RegExp("loadingServices = function\\(\\) \\{PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*update:\\s*'" + (exact ? "" : "[^']*") + name);
	//else
		var re = new RegExp("(?:loadingbonusesloaderDetails|loadingAccumulators)\\s*=\\s*function\\(\\) \\{PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*update:\\s*'" + (exact ? "" : "[^']*") + name);
	
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
	
	if(!onlyReturnParams) {
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
	} else {
		return params;
	}
}

