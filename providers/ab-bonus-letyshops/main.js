
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
	var baseurl = 'https://letyshops.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = requestPostMultipart(baseurl + 'login', {
		_username: prefs.login,
		_password: prefs.password,
		_csrf_token: ''
	}, addHeaders({
		Accept: 'application/json, text/plain, */*',
		'X-Requested-With': 'XMLHttpRequest',
	}));

	var json = getJson(html);

	if(!Array.isArray(json) || json.length != 0){
		if(json.message)
			throw new AnyBalance.Error(json.message, null, /парол/i.test(json.message));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl);
	var data = getJsonObject(html, /window.__LS\s*=/);

	if(!data){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось успешно зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(data.user.balancePending, result, 'balance');
	AB.getParam(data.user.balanceApproved, result, 'available');

	html = AnyBalance.requestGet(baseurl + 'user', g_headers);
	var loyalty = getParam(html, /:loyalty="([^"]*)/i, replaceHtmlEntities, getJson);
	result.__tariff = loyalty.level.current.name;
	if(loyalty.level.next)
		result.__tariff += ' (до ' + loyalty.level.next.name + ' ' + loyalty.level.next.delta + ' р.)';

	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_place', 'last_cashback')){
		html = AnyBalance.requestGet(baseurl + 'user/balance', g_headers);

		var order = getElements(html, [/<tr[^>]+b-table__table-row/ig, /<td/i])[0];
		if(order){
			AB.getParam(order, result, 'last_sum', /(?:Кешбек|Сумма заказа):([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(order, result, 'last_date', /Дата заказа:([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
			AB.getParam(order, result, 'last_place', /Заказ(?: реферала)? в([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
			AB.getParam(order, result, 'last_cashback', /<td[^>]+data-th="Кэшбэк"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, parseBalance);
		}
	}

	AnyBalance.setResult(result);
}
