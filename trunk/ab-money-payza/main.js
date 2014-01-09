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
	var baseurl = 'https://m.payza.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'Account/Login', g_headers);
	
	var token = getParam(html, null, null, /__RequestVerificationToken[^>]*value="([^"]+)/i);
	
	html = AnyBalance.requestPost(baseurl + 'Account/Login', {
		'__RequestVerificationToken': token,
		UserName: prefs.login,
		Password: prefs.password,
	}, addHeaders({Referer: baseurl + 'Account/Login'}));
	
	if (!/logout/i.test(html)) {
		var error = sumParam(html, null, null, [/"field-validation-error"[^>]*>([^<]+)/i, /validation[^>]+error[^>]+>([\s\S]*?)<\/ul/i], replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /selected-balance[^>]+>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /selected-balance[^>]+>([\s\S]*?)</i, replaceTagsAndSpaces, parseCurrencyMy);
	
	AnyBalance.setResult(result);
}

/** Извлекает валюту из переданного текста (типичная реализация) */
function parseCurrencyMy(text) {
	var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(\D*)-?\d[\d.,]*/);
	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	return val;
}