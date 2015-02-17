/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36',
};

function main(){
	var baseurl = 'https://my.novaposhta.ua/';
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.email, 'Введите логин!');
	checkEmpty(prefs.passw, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '?r=auth', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	html = AnyBalance.requestPost(baseurl + '?r=auth/index', {
		"LoginForm[username]": prefs.email,
		"LoginForm[password]": prefs.passw,
		'LoginForm[remember]':0,
		'yt0':'Увійти'
	}, addHeaders({'Referer' : baseurl + '?r=auth'}));
	
	if (!/Налаштування/i.test(html)) {
		var error = getParam(html, null, null, /<div class="errorSummary">\s*<ul>\s*<li>([\s\S]*)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + '?r=loyaltyUser/index');
	
	var result = {success: true};

	getParam(html, result, '__tariff', /<th>Клієнт:<\/th>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'ncard', /<th>Персональний рахунок:<\/th>\s*<td>(\d+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /<th>Доступна знижка:<\/th>\s*<td>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance);

	if(isAvailable('balance_all')){
		var now = new Date();
		var html = AnyBalance.requestPost(baseurl + 'loyaltyUser/turnoverContent', {
			Year: now.getFullYear(),
			Month: now.getMonth() + 1,
			Day: 0
		}, addHeaders({'Referer' : baseurl + '?r=loyaltyUser/index', 'X-Requested-With': 'XMLHttpRequest'}));

		getParam(html, result, 'balance_all', /Всього:<\/th>(?:\s*<th>[\s\S]*?<\/th>){5}\s*<th>(\d*)/i, replaceTagsAndSpaces, parseBalance);
	}

	// Эти счетчики не работают
	sumParam(html, result, 'balance', /<th>Залишок балів:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'send', /<th>Кількість ТТН:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'status', /<th>Статус Учасника:<\/th>\s*<td>([^<]*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status_next', /<th>Наступний статус:<\/th>\s*<td>([^<]*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}