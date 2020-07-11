
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.ihc.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login/auth', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'j_spring_security_check?ajax=true', {
		j_username: 	prefs.login,
		j_password:		prefs.password,
		recaptcha: '',
		ihccaptcha: ''
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'login/auth',
	}));

	var json = getJson(html);
	if(json.error === 'captcha'){
		var img = AnyBalance.requestGet(baseurl + 'captcha/index?x=' + new Date().getTime() + Math.random(), addHeaders({Referer: baseurl + 'login/auth'}));
		var code = AnyBalance.retrieveCode('Пожалуйста, введите цифры с картинки', img, {inputType: 'number', time: 90000});

		html = AnyBalance.requestPost(baseurl + 'j_spring_security_check?ajax=true', {
			j_username: 	prefs.login,
			j_password:		prefs.password,
			recaptcha: '',
			ihccaptcha: code,
		}, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			'Referer': baseurl + 'login/auth',
		}));

		json = getJson(html);
	}

	if(json.alert.type !== 'none'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.alert.message, null, /парол/i.test(json.alert.message));
	}

	html = AnyBalance.requestGet(baseurl, addHeaders({Referer: baseurl + 'login/auth'}));

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /data-balance\s*=\s*"([^"]*)/i, AB.replaceHtmlEntities, AB.parseBalance);
	AB.getParam(html, result, 'bonus', /data-effective-bonus-balance\s*=\s*"([^"]*)/i, AB.replaceHtmlEntities, AB.parseBalance);

	var orders = getElements(html, /<div[^>]+orderBrick__row/ig);
	getParam(orders.length, result, 'orders');
	AnyBalance.trace('найдено услуг: ' + orders.length);

	var allOrders = [], mindate = -1, minidx = -1;

	for(var i=0; i<orders.length; ++i){
		var name = getElement(orders[i], /<[^>]+orderBrick__title/i, replaceTagsAndSpaces);
		var till = getElement(orders[i], /<[^>]+orderBrick__period/i, replaceTagsAndSpaces);
		var autopay = getElement(orders[i], /<[^>]+orderBrick__autoPay/i, replaceTagsAndSpaces);
		AnyBalance.trace('Найден заказ: ' + name + ', ' + till + ', ' + autopay);
		var order = {
			name: name, 
			till: parseDate(till),
			autopay: autopay
		}
		if(minidx < 0 || order.till < mindate){
			minidx = i;
			mindate = order.till;
		}                          
		allOrders.push(order);
	}

	if(minidx >= 0){
		var order = allOrders[minidx];
		getParam(order.name, result, 'next_order_name');
		getParam(order.till, result, 'next_order_till');
		getParam(order.autopay, result, 'next_order_autopay');
	}

	AnyBalance.setResult(result);
}
