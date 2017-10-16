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
	var baseurl = 'http://www.linkfeed.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+login_form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/login/i.test(name)) {
			return prefs.login;
		} else if (/password/i.test(name)) {
			return prefs.password;
		}

		return value;
	});

	var sitekey = getParam(form, null, null, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
	if(sitekey)
		params['g-recaptcha-response'] = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, sitekey);


	html = AnyBalance.requestPost(baseurl + 'user/auth', params, addHeaders({Referer: baseurl + 'user/auth'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+color\s*:\s*red[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /авторизац/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'expense_day', /Расход\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'expense_week', /Расход\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);	
	getParam(html, result, 'income_day', /Доход\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'income_week', /Доход\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);		
	getParam(html, result, 'partnership_day', /Партнерка\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'partnership_week', /Партнерка\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance)
	getParam(html, result, 'summ_day', /Сумма\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'summ_week', /Сумма\s*<(?:[\s\S]*?<span[^>]+ru_currency[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}