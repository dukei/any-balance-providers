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
	var baseurl = 'https://secure.okpay.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/ru/account/login.html?ReturnUrl=/ru/account/index.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+aspnetForm[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	}
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (/txtLogin/i.test(name)) 
			return prefs.login;
		else if (/txtPassword/i.test(name))
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + '/ru/account/login.html?ReturnUrl=/ru/account/index.html', params, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/<div[^>]+class="balance"/i.test(html)) {
		var error = sumParam(html, null, null, /<div[^>]+error-block[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /password correctly|пароль правильно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	getParam(html, result, '__tariff', /Владелец:[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус:[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

	var wallets = getElement(html, /<ul[^>]+id="wallets"[^>]*>/i);
	wallets = getElements(wallets, /<li[^>]*>/ig);
	for(var i=0; i<wallets.length; ++i){
		sumParam(wallets[i], result, 'num', /<div[^>]+last-login[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	} 

	var balance = getElement(html, /<div[^>]+class="balance"[^>]*>/i);
	
	getParam(balance, result, 'balance', /баланс:[\s\S]*?<span[^>]*value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(balance, result, ['currency', 'balance', 'available'], /баланс:[\s\S]*?<span[^>]*value[^>]*>([\s\S]*?)<\/span>/i, [/[\d\.]+/g, '', replaceTagsAndSpaces], html_entity_decode);
	getParam(balance, result, 'available', /Доступно:[\s\S]*?<span[^>]*value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}