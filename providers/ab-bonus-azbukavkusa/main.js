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
	var baseurl = 'https://av.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'personal/bonus_cards/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+window_authorization_form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name)) {
			return prefs.login;
		} else if (/password/i.test(name)) {
			return prefs.password;
		}

		return value;
	});

	
	html = AnyBalance.requestPost(baseurl + 'azstorefront/j_spring_security_check', params, addHeaders({
		'X-Ajax-call': 'true',
		Referer: baseurl + 'personal/bonus_cards/',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(html);
	
	var result = {success: true};
	
	if (!json.success || !json.targetUrl) {
		var error = json.error;
		if (error) {
			throw new AnyBalance.Error(error, null, /парол|credentials/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(json.targetUrl, addHeaders({Referer: baseurl + 'personal/bonus_cards/'}));

	getParam(html, result, 'num', /№ карты[\s\S]*?<span[^>]*b-card-list__value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /№ карты[\s\S]*?<span[^>]*b-card-list__value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	getParam(html, result, 'balance', /<div[^>]+b-card-list__total[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_card', /Ваши бонусы[\s\S]*?<span[^>]*b-card-list__amount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phone', /Мобильный телефон[\s\S]*?<span[^>]*b-card-list__value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<span[^>]+b-card-list__status[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}