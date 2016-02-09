
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
	var baseurl = 'https://justhost.ru/auth/login';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/?returl=/billing/renew', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var auth =
		'%7B%22loginFormPage%22:%7B%22loginFormSection%22:%7B%22login%22:%22' + prefs.login +
		'%22,%22password%22:%22' +
		prefs.password + '%22,%22returl%22:%22%252Fbilling%252Frenew%22%7D,%22loginFormForgotSection%22:%7B%7D%7D%7D';


	html = AB.requestPostMultipart(baseurl + '', {
		'jFormer': auth,
		'jFormerId': 'loginForm'
	}, AB.addHeaders({
		Referer: baseurl + '/?returl=/billing/renew'
	}));

	var
		messageText = AB.getParam(html, null, null, /handleFormSubmissionResponse\(([\s\S]*?)\)/i),
		json = AB.getJson(messageText);

	if (!json.response.redirect) {
		if (json.response.failureHtml) {
			throw new AnyBalance.Error(json.response.failureHtml, null, /парол|логин/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};


	html = AnyBalance.requestGet('https://justhost.ru/billing/renew', g_headers);

	AB.getParam(html, result, 'balance', /Документация[\s\S]*?<a[^>]*>[\s\S]*?[\(]([\s\S]*?)[<\)]/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, ['currency', 'balance'], /Документация[\s\S]*?<a[^>]*>[\s\S]*?[\(]([\s\S]*?)[<\)]/i, AB.replaceTagsAndSpaces,
		AB.parseCurrency);

	if (AnyBalance.isAvailable('activeServices')) {

		html = AnyBalance.requestGet('https://justhost.ru/billing/active', g_headers);

		var items = AB.getElement(html, /<table[^>]*class=['"][^'"]*items[^'"]*['"]>/i);
		AnyBalance.trace(items);
		var trArray = AB.sumParam(items, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);
		var
			id, date, office, status, activeServices = [];

		var tdArray = [];

		for (var i = trArray.length - 1; i > 1; i--) {
			tdArray = AB.sumParam(trArray, null, null, /<td[^>]*>([\s\S]*?)<\/td>/gi);
			AnyBalance.trace(tdArray);
			id = AB.getParam(tdArray[2], null, null, /<b[^>]*>([\s\S]*?)<\/b>/i, AB.replaceTagsAndSpaces);
			status = AB.getParam(tdArray[2], null, null, /<div[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
			name = AB.getParam(tdArray[3], null, null, /([\s\S]*?)<[bs]/i, AB.replaceTagsAndSpaces);
			date = AB.getParam(tdArray[4], null, null, /<div[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
			tariff = AB.getParam(tdArray[5], null, null, null, AB.replaceTagsAndSpaces);
			activeServices.push(id + ' | ' + status + ' | ' + name + ' | ' + date + ' | ' + tariff);
		}
		AB.getParam(activeServices.join('<br/>'), result, 'activeServices');
	}
	AnyBalance.setResult(result);
}
