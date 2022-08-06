
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

var g_currency = {
	KZT: 'тг.',
    RUB: 'руб.',
    RUR: 'руб.',
    UAH: 'грн.',
    EUR: '€',
    USD: '$',
    GBP: '£',
	ARS: 'ARS',
	CLP: 'CLP',
    MXN: 'MXN',
	COP: 'COP',
	BRL: 'R$',
	PEN: 'S/',
	PLN: 'zł',
	BYN: 'Br',
    CAD: 'C$',
    AUD: 'A$',
    NZD: 'NZ$',
    ZAR: 'R',
    INR: 'INR',
    PHP: '₱',
    AED: 'AED',
    CNY: 'CNY',
	undefined: ''
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://letyshops.com/ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

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
		'X-Requested-With': 'XMLHttpRequest'
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

	getParam(data.user.balancePending, result, ['balance', 'currency'], null, null, parseBalance);
	getParam(data.user.balanceApproved, result, ['available', 'currency'], null, null, parseBalance);
	getParam(g_currency[data.user.balanceCurrency]||data.user.balanceCurrency, result, ['currency', 'balance']);
	getParam(data.user.balanceCurrency, result, ['currency_full', 'balance']);

	html = AnyBalance.requestGet(baseurl + 'user', g_headers);
    getParam(html, result, '__tariff', /Статус:[\s\S]*?<div class="text-lg[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'all_cashback', /Накоплено за все время:[\s\S]*?text-base[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_type', 'last_cashback', 'last_status')){
		html = AnyBalance.requestGet(baseurl + 'user/ajax/filtered/balance?page[offset]=0&page[limit]=12', addHeaders({
			Referer: baseurl + 'user/balance', 'X-Requested-With': 'XMLHttpRequest'
		}));
		json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
		
		var orders = json.data;
	    if(orders && orders.length > 0){
	    	AnyBalance.trace('Найдено покупок: ' + orders.length);
			var order = orders[0];
			if(order.data.converted_cart_amount){
				getParam(order.data.converted_cart_amount, result, 'last_sum', null, null, parseBalance);
			}else{
				getParam(0, result, 'last_sum', null, null, parseBalance);
			}
	    	getParam(order.created, result, 'last_date', null, null, parseDateISO);
            var shopName = '';
			if(order.data.shop && order.data.shop.name){
				getParam(order.translatedType + order.data.shop.name, result, 'last_type');
			}else{
				getParam(order.translatedType, result, 'last_type');
			}
			getParam(0||order.amount, result, 'last_cashback', null, null, parseBalance);
			getParam(order.translatedStatus, result, 'last_status');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последней покупке');
 	    }
	}

	AnyBalance.setResult(result);
}
