/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/vnd.wallet.openapi.v1+json',
	'Content-Type': 'application/vnd.wallet.openapi.v1+json',
	'Origin': 'https://lk.udengi.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.udengi.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'OpenApi/sessions', '{"Login":"' + prefs.login + '","Password":"' + prefs.password + '","Scope":"All"}', addHeaders({
		'Authorization': 'Bearer 48DB15D5-4762-45A7-8A36-B00E25C773A1',
		Referer: baseurl
	}));
	var json = getJson(html);
	
	if (!json.Token) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	AnyBalance.setCookie('*.udengi.ru', 'unistream:SessionKey', json.Token);
	AnyBalance.setCookie('*.udengi.ru', 'Authorization', 'Bearer ' + json.Token);
	
	html = AnyBalance.requestGet(baseurl + 'OpenApi/balance', addHeaders({
		Referer: baseurl,
		'Authorization': 'Bearer ' + json.Token,
	}));
	
	json = getJson(html);
	
	var result = {success: true};
	
	for(var i = 0; i < json.length; i++) {
		var curr = json[i];
		
		if(curr.CurrencyId == 643) {
			getParam(curr.Amount + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
			result['currency'] = ' р';
		} else {
			AnyBalance.trace('Валюта не поддерживается ' + JSON.stringify(curr));
		}
	}
	
	AnyBalance.setResult(result);
}
