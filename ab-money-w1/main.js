/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Origin':'https://www.walletone.com',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36',
	'Accept': 'application/vnd.wallet.openapi.v1+json',
	'Content-type': 'application/vnd.wallet.openapi.v1+json',
	'Referer':'https://www.walletone.com/client/?attempt=1',
	'Accept-Language': 'ru-RU'
};

var g_currency = {
	980: '₴',
	398: '₸',
	643: 'р',
	710: 'ZAR',
	840: '$',
	978: '€'
}
	
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.walletone.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'wallet/client/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	var script = getParam(html, null, null, /src="(script.js[^"]+)/i);
	html = AnyBalance.requestGet(baseurl + 'wallet/client/' + (script || ''), g_headers);
	
	var token = getParam(html, null, null, /APP_TOKEN:"([\dA-F-]+)"/i);
	if(!token || !script) {
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}
	
	html = AnyBalance.requestPost(baseurl + 'OpenApi/sessions', JSON.stringify({Login:prefs.login, Password:prefs.password, Scope:'All'}), addHeaders({
		Referer: 'http://www.walletone.com/ru/wallet/',
		Authorization: 'Bearer ' + token
	}));
	
	var json = getJson(html);
	
	if (!json.UserId) {
		var error = json.ErrorDescription;
		if (error)
			throw new AnyBalance.Error(error, null, /Пароль пользователя не соответствует|не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	g_headers = addHeaders({Authorization: 'Bearer ' + json.Token});
	
	//html = AnyBalance.requestGet(baseurl + 'OpenApi/profile?userId=' + json.UserId, g_headers);
	html = AnyBalance.requestGet(baseurl + 'OpenApi/balance', g_headers);
	
	json = getJson(html);
	
	// Ищем нужную валюту, по умолчанию рубль
	var currencyCode = prefs.currency || 643;
	var currentItem;
	
	for(var i = 0; i < json.length; i++) {
		if(json[i].CurrencyId == currencyCode) {
			currentItem = json[i];
			break;
		}
	}
	if(!currentItem) {
		throw new AnyBalance.Error('Не удалось найти кошелек с выбранной валютой (' + g_currency[currencyCode] + ')!');
	}
	
	var result = {success: true};
	
	getParam(currentItem.Amount + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(currentItem.SafeAmount + '', result, 'SafeAmount', null, replaceTagsAndSpaces, parseBalance);
	getParam(currentItem.HoldAmount + '', result, 'HoldAmount', null, replaceTagsAndSpaces, parseBalance);
	getParam(currentItem.Overdraft + '', result, 'Overdraft', null, replaceTagsAndSpaces, parseBalance);	
	result.currency = g_currency[currencyCode];
	
	AnyBalance.setResult(result);
}