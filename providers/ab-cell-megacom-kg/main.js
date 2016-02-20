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
	var baseurl = 'https://my.megacom.kg/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */
	var html = AnyBalance.requestGet(baseurl + 'login.xhtml', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'abonLogin')
			return prefs.login;
		else if (name == 'abonPass')
			return prefs.password;
		return value;
	});

	// есть ли капча?
	if(params.hasOwnProperty('captchaText')) {
		var imgUrl = getParam(html, null, null, /<img[^>]*?id\s*?=\s*?['"]image['"][^>]*?src\s*?=\s*?['"]([\s\S]*?)['"][^>]*?\/>/i, null, html_entity_decode);
		var img = AnyBalance.requestGet(baseurl + imgUrl, g_headers);
		var captcha = AnyBalance.retrieveCode('Введите код с картинки', img);
		params['captchaText'] = captcha;
	}
	
	params.submitButton = 'submitButton';
	
	html = AnyBalance.requestPost(baseurl + 'login.xhtml', params, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выход' проверяем залогинились или нет
	var exitLink = getParam(html, null, null, /<button[^>]*?id\s*?=\s*?['"]logout['"][^>]*?>[\s\S]*?>\s*?<span[^>]*?>([\s\S]*?)<\/span[^>]*?>\s*?<\/button/i, replaceTagsAndSpaces);
	if (!/Выход/i.test(exitLink)) {
		// определяем ошибку
		var error = getElementsByClassName(html, 'ui-messages-error-summary', replaceTagsAndSpaces);
		if (error.length)
			throw new AnyBalance.Error(error[0], null, /Введен неверный логин или пароль|Введите логин в формате|Пользователя не существует/i.test(error[0]));
		
		// если не смогли определить ошибку, то показываем дефолтное сообщение
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	/* Получаем данные */

	var result = {success: true};

	var html = AnyBalance.requestGet(baseurl + 'view/account/account-state.xhtml', g_headers);

	getParam(html, result, 'balance', /Баланс[\s\S]*?templateBalance[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Текущий\s*?тарифный\s*?план[\s\S]*?<a[^>]*?>([\s\S]*?)<\/a/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Статус\s*?абонента[\s\S]*?<label[^>]*?>([\s\S]*?)<\/label/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /Лицевой\s*?счет[\s\S]*?<span[^>]*?templateAccount[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces);
	getParam(html, result, 'date_activation', /Дата\s*?активации\s*?подключения\s*?абонента[\s\S]*?<label[^>]*?[^>]*?>([\s\S]*?)<\/label/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'balance_month', /Баланс\s*?на\s*?первое\s*?число\s*?текущего\s*?месяца[\s\S]*?<span[^>]*?[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_month_calls', /Расходы\s*?на\s*?звонки\s*?с\s*?начала\s*?текущего\s*?месяца[\s\S]*?<span[^>]*?[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_month_fee', /Абонентская\s*?плата\s*?за\s*?услуги\s*?с\s*?начала\s*?месяца[\s\S]*?<span[^>]*?[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_month_services', /Начисления\s*?за\s*?дополнительные\s*?услуги\s*?с\s*?начала\s*?месяца[\s\S]*?<span[^>]*?[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_month_pay', /Получено\s*?платежей\s*?с\s*?начала\s*?месяца[\s\S]*?<span[^>]*?[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_login', /Актуальный\s*?баланс\s*?на\s*?момент\s*?входа\s*?в\s*?Личный\s*?кабинет[\s\S]*?<span[^>]*?[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
