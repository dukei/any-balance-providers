/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mynew.kyivgaz.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Account/Login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'PersonalAccount')
			return prefs.login;
		else if (name == 'Password')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'Account/Login', params, addHeaders({
		Referer: baseurl + 'Account/Login'
	}));

	if (!/LogOff/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors text-danger"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Особовий рахунок за таким номером ще не зареєстрований|Пароль не вірний|Невірна спроба входу/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}


	var result = {success: true};
	getParam(html, result, 'lastPayment', /ОСТАННІЙ ПЛАТІЖ(?:[^>]*>){7}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'datePayment', /ОСТАННІЙ ПЛАТІЖ(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'fio', / <div[^>]+class="project-label"[^>]*>АБОНЕНТ(?:[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	if(isAvailable(['calc', 'debt'])) {
		html = AnyBalance.requestGet(baseurl+'Client/_payments', g_headers);
		var json = getJson(html);
		var paymentElement = json.payments ? json.payments[0] : undefined;
		if(paymentElement) {
			getParam(paymentElement.CALC, result, 'calc', null, null, parseBalance);
			getParam(paymentElement.DEBT, result, 'debt', null, null, parseBalance);
		}
		else
			AnyBalance.trace("Не удалось получить данные по платежам. Сайт изменён?");
	}

	AnyBalance.setResult(result);
}