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

var g_region_change = {
	kzn: 'kazan',
	nch: 'chelny',
	nsk: 'novosib'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region || 'kzn'; // Казань по умолчанию
	
	if(g_region_change[domain])
		domain = g_region_change[domain];
	
	AnyBalance.trace('Selected region: ' + domain);
	var baseurl = 'https://lk.domru.ru/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var info = AnyBalance.requestGet(baseurl + "login");
	var token = getParam(info, null, null, /<input[^>]+value="([^"]*)"[^>]*name="YII_CSRF_TOKEN"/i);
	if (!token)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
	AnyBalance.setCookie('domru.ru', 'citydomain'); //Удаляем старую куку
	AnyBalance.setCookie('.domru.ru', 'service', '0');
	AnyBalance.setCookie('.domru.ru', 'citydomain', domain, {path: '/'});
	
	// Заходим на главную страницу
	var info = AnyBalance.requestPost(baseurl + "login", {
		YII_CSRF_TOKEN: token,
		"Login[username]": prefs.log,
		"Login[password]": prefs.pwd,
		city: domain,
		yt0: 'Войти'
	});

 	if(!/\/logout/.test(info)) {
		var error = sumParam(info, null, null, /<div[^>]+class="b-login__errormessage"[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(info);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	if(isAvailable(['balance', 'pay_till'])){
		var res = AnyBalance.requestPost(baseurl + 'user', [
			['needProperties[]', 'balance'],
			['needProperties[]', 'dataPay'],
			['needProperties[]', 'paymentAmount'],
			['YII_CSRF_TOKEN', token]
		], addHeaders({ 'X-Requested-With': 'XMLHttpRequest' }));

		var user = {};
		try{
			user = getJson(res);
		} catch(e) { }

		getParam(user.bill.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam(user.bill.datePay, result, 'pay_till', null, replaceTagsAndSpaces, html_entity_decode);
	}

	getParam(info, result, 'tariff_number', /№ договора:\s*<\/div>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'name', /b-head-block-account-info-name[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, '__tariff', /Ваш пакет[^<]*<a[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'bits', /status__block-item_bonus[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'status', /<a[^>]+href="[^"]*status.domru.ru"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
};